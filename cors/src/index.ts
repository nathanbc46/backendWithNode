import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { SignJWT, jwtVerify } from 'jose'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const app = new Hono()
const JWT_SECRET = 'MustBeSecret'

interface User {
  id: number
  username: string
  password: string
  credit: number
}

const users: User[] = [
  {
    id: 1,
    username: 'john',
    password: '123',
    credit: 2000
  },
  {
    id: 2,
    username: 'i_am_hacker',
    password: '123',
    credit: 100
  }
]

const withAuth = createMiddleware<{
  Variables: {
    userId: number
    user: User
  }
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }

  try {
    const { payload } = await jwtVerify(authHeader.split(' ')[1], new TextEncoder().encode(JWT_SECRET)) // ถอดรหัส access token และดึง userId
    if (!payload || typeof payload.userId !== 'number') {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }
    c.set('userId', payload.userId) // ตั้งค่า userId ใน context
    const user = users.find(u => u.id === payload.userId) // ดึงข้อมูลผู้ใช้จาก userId
    if (!user) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }
    c.set('user', user) // ตั้งค่า user ใน context
    await next() // เรียก route ถัดไป
  } catch (e) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
})

// ❌ อาจจะควรทำแค่เฉพาะ Dev Environment หรือ Production ที่มีความปลอดภัยสูง หรือเป็น Public API
// 👇 ควรตั้งค่าอนุญาตเฉพาะ origin ที่เรามั่นใจเท่านั้น
// https://hono.dev/docs/middleware/builtin/cors#usage
//app.use('*', cors()) // คือ อนุญาตให้เข้าถึงข้อมูลจากทุก domain ที่เรามั่นใจเท่านั้น
app.use('*', cors({
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}))

app.post('/api/login', zValidator('json', z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})), async (c) => {
  const { username, password } = c.req.valid('json')
  const user = users.find(u => u.username === username && u.password === password)
  if (!user) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  const token = await new SignJWT({ userId: user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(new TextEncoder().encode(JWT_SECRET))
  return c.json({ data: { token }  })
})

app.post('/api/transfer', withAuth, zValidator('json', z.object({
  username: z.string().min(1),
  amount: z.number().min(0)
})), async (c) => {
  const { username, amount } = c.req.valid('json')
  const user = users.find(u => u.username === username)
  if (!user) {
    throw new HTTPException(404, { message: 'User not found' })
  }
  const sender = c.get('user')
  if (sender.credit < amount) {
    throw new HTTPException(400, { message: 'Not enough credit' })
  }
  sender.credit -= amount
  user.credit += amount
  return c.json({ data: { user, amount }, message: 'Transfer successful' })
})


app.get('/api/users', async (c) => {
  return c.json({ data: users }) // แสดงข้อมูลผู้ใช้ ในรูปแบบ JSON
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  return c.json({ error: 'Internal Server Error' }, 500)
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
