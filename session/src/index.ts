import { serve } from '@hono/node-server' // สำหรับรันแอปพลิเคชัน Hono บน Node.js
import { randomBytes } from 'node:crypto' // สำหรับสร้างคีย์แบบสุ่ม
import { type Context, Hono } from 'hono' // สำหรับสร้างแอปพลิเคชัน Hono
import { PrismaClient } from '@prisma/client' // สำหรับการเชื่อมต่อกับฐานข้อมูล Prisma
import argon2 from '@node-rs/argon2' // สำหรับการแฮชรหัสผ่าน
import { HTTPException } from 'hono/http-exception' // สำหรับจัดการข้อผิดพลาด HTTP
import { zValidator } from '@hono/zod-validator' // สำหรับการตรวจสอบข้อมูลด้วย Zod
import { z } from 'zod' // สำหรับการตรวจสอบข้อมูลด้วย Zod
import { getCookie, setCookie, deleteCookie } from 'hono/cookie' // สำหรับจัดการ cookie
import { createMiddleware } from 'hono/factory' // สำหรับสร้าง middleware ที่กำหนดเอง
import { showRoutes } from 'hono/dev' // สำหรับแสดงเส้นทางทั้งหมดที่กำหนดในแอปพลิเคชัน

const prisma = new PrismaClient()
const app = new Hono()

const sessionCookieKey = 'session' // ชื่อของ cookie
const maxAge = 60 * 60 * 24 * 7 // 7 days

// ฟังก์ชันสำหรับสร้างวันหมดอายุใหม่
function generateNewExpiresAt(): Date {
  return new Date(Date.now() + maxAge * 1000) // แปลงวินาทีเป็นมิลลิวินาที
}

// ฟังก์ชันสำหรับสร้าง session ใหม่
async function createSession(c: Context, userId: number): Promise<void> {
  const key = randomBytes(32).toString('hex') // สร้างคีย์แบบสุ่ม
  await prisma.session.create({
    select: { id: true },
    data: {
      userId,
      key,
      expiresAt: generateNewExpiresAt(),
    }
  })
  setCookie(c, sessionCookieKey, key, { // ตั้งค่า cookie
    httpOnly: true,
    maxAge,
  })
}

// สร้าง middleware สำหรับตรวจสอบการเข้าสู่ระบบ และอัปเดตวันหมดอายุของ session
const mustAuth = createMiddleware<{
  Variables: { // กำหนดตัวแปรที่ต้องการเก็บใน context
    userId: number
  }
}>(async (c, next) => {
  const key = getCookie(c, sessionCookieKey) // ดึงค่า cookie ที่เก็บ session key
  if (!key) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  const session = await prisma.session.findUnique({ // ค้นหา session ตาม key
    where: { key },
  })
  
  if (!session) { // ถ้าไม่พบ session ให้ลบ cookie และส่งข้อผิดพลาด
    deleteCookie(c, sessionCookieKey)
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  if (session.expiresAt < new Date()) { // ตรวจสอบว่า session หมดอายุหรือไม่ ถ้าหมดอายุให้ลบ session ออก
    deleteCookie(c, sessionCookieKey)
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  session.expiresAt = generateNewExpiresAt() // อัปเดตวันหมดอายุของ session
  await prisma.session.update({
    where: { id: session.id },
    data: { expiresAt: session.expiresAt }
  })
  // ตั้งค่า cookie ใหม่พร้อมวันหมดอายุใหม่
  setCookie(c, sessionCookieKey, key, {
    httpOnly: true,
    maxAge,
  })
  c.set('userId', session.userId) // เก็บ userId ใน context เพื่อใช้ใน route อื่น ๆ
  await next()
})

// สร้าง schema สำหรับการตรวจสอบข้อมูลการลงทะเบียนและเข้าสู่ระบบ
const inputAuth = zValidator('json', z.object({
  email: z.string().email(),
  password: z.string().min(6),
}))

// กำหนด route สำหรับการลงทะเบียน
app.post('/sign-up', inputAuth, async (c) => {
  const data = c.req.valid('json') // ดึงข้อมูลจาก request
  data.password = await argon2.hash(data.password) // แฮชรหัสผ่าน
  await prisma.user.create({ data }) // สร้างผู้ใช้ใหม่ในฐานข้อมูล
  return c.json({ message: 'Signed up' })
})

// กำหนด route สำหรับการเข้าสู่ระบบ
app.post('/login', inputAuth, async (c) => {
  const data = c.req.valid('json')
  const user = await prisma.user.findUnique({ where: { email: data.email } }) // ค้นหาผู้ใช้ตามอีเมล
  if (!user) {
    throw new HTTPException(401, { message: 'Invalid credentials' })
  }
  if (!await argon2.verify(user.password, data.password)) { // ตรวจสอบรหัสผ่าน ถ้าไม่ตรง ให้ส่งข้อผิดพลาด
    throw new HTTPException(401, { message: 'Invalid credentials' })
  }
  await createSession(c, user.id) // สร้าง session ใหม่และตั้งค่า cookie
  return c.json({ message: 'Logged in' })
})


app.get('/me', mustAuth, async (c) => { // ใช้ middleware mustAuth เพื่อตรวจสอบการเข้าสู่ระบบ
  // ถ้าเข้าสู่ระบบสำเร็จ จะมี userId ใน context
  const userId = c.get('userId')
  const user = await prisma.user.findUnique({ where: { id: userId } }) // ค้นหาผู้ใช้ตาม userId
  return c.json({ data: user })
})

showRoutes(app) // แสดงเส้นทางทั้งหมดที่กำหนดในแอปพลิเคชัน

app.onError((err, c) => { // จัดการข้อผิดพลาดที่เกิดขึ้นในแอปพลิเคชัน
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