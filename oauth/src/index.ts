import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'
import { HTTPException } from 'hono/http-exception'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { randomUUID } from 'node:crypto'
import { ofetch } from 'ofetch'
import { jwtVerify, SignJWT } from 'jose'
import { createMiddleware } from 'hono/factory'
import { config } from 'dotenv'
import { showRoutes } from 'hono/dev'

config() // Load environment variables from .env file

const prisma = new PrismaClient()
const app = new Hono()

// Middleware to handle authentication
const authMiddleware = createMiddleware<{
  Variables: {
    accountId: number
  }
}>(async (c, next) => {
  const token = getCookie(c, 'token')
  if (!token) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  // คือตรวจสอบ JWT token
  const { payload: { accountId } } = await jwtVerify<{ accountId: number }>(token, new TextEncoder().encode(process.env.JWT_SECRET))
  c.set('accountId', accountId) // Store accountId in context for later use
  return next()
})

// คือ Route สำหรับการลงทะเบียนผู้ใช้ใหม่
app.get('/auth/google', async (c) => {
  const state = randomUUID() // คือ สร้าง state เพื่อป้องกัน CSRF
  setCookie(c, 'oauthState', state, { // เก็บ state ใน cookie เพื่อใช้ตรวจสอบเมื่อกลับมาจาก Google
    httpOnly: true,
  })
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth') // สร้าง URL สำหรับ OAuth 2.0
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID) // คือ ตั้งค่า client_id จาก environment variable
  url.searchParams.set('redirect_uri', process.env.GOOGLE_CALLBACK_URL) // ตั้งค่า redirect_uri ที่ Google จะส่งกลับมาหลังจากการยืนยันตัวตน
  url.searchParams.set('response_type', 'code') // คือ ตั้งค่า response_type เป็น 'code' เพื่อรับ authorization code
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile') // ตั้งค่า scope ที่ต้องการเข้าถึง (ต้องการสิทธิ์อะไรบ้างจาก Google) https://developers.google.com/identity/protocols/oauth2/scopes?hl=th
  url.searchParams.set('state', state) // คือ ตั้งค่า state เพื่อป้องกัน CSRF
  return c.redirect(url)
})

// คือ Route ที่ Google จะส่งกลับมาหลังจากการยืนยันตัวตน
app.get('/auth/google/callback', async (c) => {
  const error = c.req.query('error') // ตรวจสอบว่ามี error หรือไม่
  if (error) {
    throw new HTTPException(400, { message: `Google OAuth error: ${error}` })
  }
  const stateFromCookie = getCookie(c, 'oauthState') // ดึง state จาก cookie
  if (!stateFromCookie) {
    throw new HTTPException(400, { message: 'Missing state cookie' })
  }
  const state = c.req.query('state')
  if (state !== stateFromCookie) { // ตรวจสอบว่า state ที่ส่งกลับมาจาก Google ตรงกับ state ที่เก็บไว้ใน cookie หรือไม่ เพื่อป้องกัน CSRF ที่อาจเกิดขึ้นจากเว็บไซต์อื่น
    deleteCookie(c, 'oauthState') // ลบ state cookie ถ้าไม่ตรงกัน
    throw new HTTPException(400, { message: 'Invalid state' })
  }

  //กระบวนการหลักในการ
  const code = c.req.query('code') // ดึง authorization code จาก query parameters
  const tokenResponse = await ofetch<{ // คือ ดึง access token จาก Google OAuth 2.0 API
    access_token: string
  }>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: {
      code, // authorization code ที่ได้รับจาก Google
      client_id: process.env.GOOGLE_CLIENT_ID, // client_id ที่ตั้งค่าไว้ใน environment variable
      client_secret: process.env.GOOGLE_CLIENT_SECRET, // client_secret ที่ตั้งค่าไว้ใน environment variable
      redirect_uri: process.env.GOOGLE_CALLBACK_URL, // redirect_uri ที่ตั้งค่าไว้ใน environment variable
      grant_type: 'authorization_code', // คือ ตั้งค่า grant_type เป็น 'authorization_code'
    }
  })

  const userInfoEmailResponse = await ofetch<{ // ดึงข้อมูลผู้ใช้จาก Google UserInfo API
    email: string
    name: string
    id: string
  }>('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
    headers: {
      Authorization: `Bearer ${tokenResponse.access_token}` // ใช้ access token ที่ได้รับจาก Google
    }
  })

  if (!userInfoEmailResponse.email) {
    throw new HTTPException(400, { message: 'Failed to retrieve user email from Google' })
  }

  // คือตรวจสอบว่ามีผู้ใช้ที่ลงทะเบียนด้วย Google อยู่แล้วหรือไม่ (กระบวนการของเราเอง)
  const provider = await prisma.provider.findFirst({ 
    where: {
      providerId: userInfoEmailResponse.id,
      provider: 'google'
    }
  })

  let accountId: number
  if (provider) {
    // ถ้ามีผู้ใช้ที่ลงทะเบียนด้วย Google อยู่แล้ว ให้ใช้ accountId ของผู้ใช้นั้น
    accountId = provider.accountId
  } else {
    // ถ้ายังไม่มีผู้ใช้ ให้สร้างผู้ใช้ใหม่
    const newAccount = await prisma.account.create({
      data: {
        name: userInfoEmailResponse.name,
        providers: { 
          create: { // สร้างข้อมูล provider ใหม่ และเชื่อมโยงกับผู้ใช้
            providerId: userInfoEmailResponse.id,
            provider: 'google'
          }
        }
      }
    })
    accountId = newAccount.id
  }
  
  const token = await new SignJWT({ accountId }) // สร้าง JWT token ด้วย accountId
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt() // ตั้งเวลา issuedAt เป็นเวลาปัจจุบัน
    .setExpirationTime('1y') // ตั้งเวลา expiration เป็น 1 ปี
    .sign(new TextEncoder().encode(process.env.JWT_SECRET)) // เซ็นด้วย JWT secret ที่ตั้งค่าไว้ใน environment variable
  setCookie(c, 'token', token) // ตั้งค่า cookie สําหรับ access token
  return c.redirect('/me')
})

// Route สำหรับดึงข้อมูลผู้ใช้ที่เข้าสู่ระบบ
// ใช้ authMiddleware เพื่อตรวจสอบการเข้าสู่ระบบ
app.get('/me', authMiddleware, async (c) => {
  return c.json({
    accountId: c.get('accountId'), // ดึง accountId จาก context ที่เก็บไว้ใน authMiddleware
  })
})

app.get('/logout', async (c) => {
  deleteCookie(c, 'token') // ลบ cookie ที่เก็บ access token
  return c.json({ message: 'Logged out successfully' })
})

app.onError((err, c) => { // คือ จัดการ error ที่เกิดขึ้นในแอปพลิเคชัน
  //console.error(err) // แสดง error ใน console
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  return c.json({ error: 'Internal Server Error' }, 500)
})

showRoutes(app) // Show all routes in the console for debugging

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
