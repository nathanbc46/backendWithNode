import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'
import { HTTPException } from 'hono/http-exception'
import bcrypt from 'bcrypt'//pnpm approve-builds (กด a บนคีร์บอร์ด) , pnpm rebuild bcrypt , pnpm add bcrypt
import argon2 from '@node-rs/argon2'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { showRoutes } from 'hono/dev'

const prisma = new PrismaClient()
const app = new Hono()

app.get('/users', async (c) => {
  const users = await prisma.user.findMany()
  return c.json({ data: users })
})

// คือ การกำหนดรูปแบบข้อมูลที่คาดหวังสำหรับการรับข้อมูล JSON
const authInput = zValidator('json', z.object({
  email: z.string().min(1).email().trim(),
  password: z.string().min(6).trim()
}))

// การใช้ brypt สำหรับการแฮชและลงทะเบียนผู้ใช้
app.post('/bcrypt/sign-up', authInput, async (c) => {
  const data = c.req.valid('json')
  data.password = await bcrypt.hash(data.password, 10)
  await prisma.user.create({ data })
  return c.json({ message: 'User created successfully' })
})

// การใช้ brypt สำหรับการเข้าสู่ระบบผู้ใช้
app.post('/bcrypt/sign-in', authInput, async (c) => {
  const data = c.req.valid('json')
  const user = await prisma.user.findUnique({ where: { email: data.email } })
  if (!user) {
     throw new HTTPException(401, { message: 'Invalid credentials' })
  }
  const isValid = await bcrypt.compare(data.password, user.password)
  if (!isValid) {
     throw new HTTPException(401, { message: 'Invalid credentials' })
  }
   return c.json({ message: 'Logged in (Bcrypt)', data: user })
})

// การใช้ argon2 สำหรับการลงทะเบียนผู้ใช้
app.post('/argon2/sign-up', authInput, async (c) => {
  const data = c.req.valid('json')
  data.password = await argon2.hash(data.password)
  await prisma.user.create({ data })
  return c.json({ message: 'User created successfully' })
})

// การใช้ argon2 สำหรับการเข้าสู่ระบบผู้ใช้
app.post('/argon2/sign-in', authInput, async (c) => {
  const data = c.req.valid('json')
  const user = await prisma.user.findUnique({ where: { email: data.email } })
  if (!user) {
     throw new HTTPException(401, { message: 'Invalid credentials' })
  }
  const isValid = await argon2.verify(user.password, data.password)
  if (!isValid) {
     throw new HTTPException(401, { message: 'Invalid credentials' })
  }
   return c.json({ message: 'Logged in (Argon2)', data: user })
})

showRoutes(app)// Show all routes in development mode

// Error handling middleware
app.onError((err, c) => {
  console.error(err)
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
