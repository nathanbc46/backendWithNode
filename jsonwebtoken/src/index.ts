import { serve } from '@hono/node-server'
import { type Context, Hono } from 'hono'
import { PrismaClient } from '@prisma/client'
import argon2 from '@node-rs/argon2'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createMiddleware } from 'hono/factory'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { SignJWT, jwtVerify } from 'jose'
import { showRoutes } from 'hono/dev'

const prisma = new PrismaClient()
const app = new Hono()

// private keys for JWT คีที่ใช้ในการเข้ารหัสและถอดรหัส JWT
// ควรเก็บเป็นความลับและไม่ควรเปิดเผยในโค้ดสาธารณะ
// ในโปรเจกต์จริง ควรใช้ environment variables หรือ secret management tools
const JWT_ACCESS_SECRET = 'secret1'
const JWT_REFRESH_SECRET = 'secret2'

const inputAuth = zValidator('json', z.object({
  email: z.string().email(),
  password: z.string().min(6),
}))

//คือฟังก์ชันที่ใช้สร้าง JWT ใหม่และตั้งค่า cookie
// โดยรับพารามิเตอร์เป็น Context และ userId
async function generateNewJWTAndSetCookie(c: Context, userId: number, email?: string) {
  const [accessToken, refreshToken] = await Promise.all([
    new SignJWT({ userId, email }) // สร้าง JWT สำหรับ access token (payload คือ userId เพื่อระบุตัวตนของผู้ใช้ หรือข้อมูลอื่น ๆ ที่ต้องการเก็บใน JWT)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30m')
      .sign(new TextEncoder().encode(JWT_ACCESS_SECRET)),
    new SignJWT({ userId, email }) // สร้าง JWT สำหรับ refresh token
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(new TextEncoder().encode(JWT_REFRESH_SECRET)),
  ])
  setCookie(c, 'accessToken', accessToken)// ตั้งค่า cookie สำหรับ access token
  setCookie(c, 'refreshToken', refreshToken)// ตั้งค่า cookie สำหรับ refresh token

}

// ฟังก์ชันนี้ใช้สำหรับตรวจสอบว่าผู้ใช้ได้เข้าสู่ระบบหรือไม่ โดยใช้ middleware
const mustAuth = createMiddleware<{
  Variables: {
    userId: number,
    email: string
  }
}>(async (c, next) => {
  const accessToken = getCookie(c, 'accessToken') // ดึง access token จาก cookie ถ้าไม่มีให้ throw error
  if (!accessToken) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  const refreshToken = getCookie(c, 'refreshToken')
  if (!refreshToken) {
    throw new HTTPException(401, { message: 'Unauthorized' }) // ดึง refresh token จาก cookie ถ้าไม่มีให้ throw error
  }
  try { // ถอดรหัส access token และดึง userId
    // payload: { userId } คือการดึงข้อมูล userId จาก payload ของ access token
    const { payload: { userId, email } } = await jwtVerify<{ userId: number, email: string }>(accessToken, new TextEncoder().encode(JWT_ACCESS_SECRET)) // ถอดรหัส access token และดึง userId
    c.set('userId', userId)
    c.set('email', email) // ตั้งค่า userId และ email ใน context เพื่อใช้ใน route ถัดไป
    await next()
  } catch (error) { // ถ้า access token หมดอายุหรือไม่ถูกต้อง ให้ใช้ refresh token เพื่อสร้าง access token ใหม่
    try {
      const { payload: { userId, email } } = await jwtVerify<{ userId: number, email: string }>(refreshToken, new TextEncoder().encode(JWT_REFRESH_SECRET))
      generateNewJWTAndSetCookie(c, userId) // สร้าง access token ใหม่จาก refresh token
      c.set('userId', userId)
      c.set('email', email) // ตั้งค่า userId และ email ใน context เพื่อใช้ใน route ถัดไป
      await next()
    } catch (error) { // ถ้า refresh token หมดอายุหรือไม่ถูกต้อง ให้ลบ cookie ทั้งสองและ throw error
      deleteCookie(c, 'accessToken', { httpOnly: true })
      deleteCookie(c, 'refreshToken', { httpOnly: true })
      throw new HTTPException(401, { message: 'Unauthorized' })
    }
  }
})

app.post('/sign-up', inputAuth, async (c) => {
  const data = c.req.valid('json')
  data.password = await argon2.hash(data.password)
  await prisma.user.create({ data })
  return c.json({ message: 'Signed up' })
})

app.post('/login', inputAuth, async (c) => {
  const data = c.req.valid('json')
  const user = await prisma.user.findUnique({ where: { email: data.email } })
  if (!user) {
    throw new HTTPException(401, { message: 'Invalid credentials' })
  }
  if (!await argon2.verify(user.password, data.password)) {
    throw new HTTPException(401, { message: 'Invalid credentials' })
  }
  generateNewJWTAndSetCookie(c, user.id, user.email) // สร้าง JWT ใหม่และตั้งค่า cookie
  return c.json({ message: 'Logged in' })
})

app.get('/me', mustAuth, async (c) => {
  const userId = c.get('userId')
  const email = c.get('email')
  console.log('userId:', userId, 'email:', email)
  // ตรวจสอบว่า userId และ email มีค่าอยู่หรือไม่ ถ้าไม่มีให้ throw error
  // เพื่อป้องกันการเข้าถึงข้อมูลของผู้ใช้ที่ไม่ได้เข้าสู่ระบบ
  if (!userId || !email) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  const user = await prisma.user.findUnique({ where: { id: userId } })
  return c.json({ data: user })
})

showRoutes(app)

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  return c.json({ error: 'Internal server error' }, 500)
})

const port = 3000
console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})
