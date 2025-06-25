import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import emailValidator from 'email-validator'
import { z } from 'zod' // https://zod.dev/
import signUp from './input/signUp.js'

const app = new Hono()

interface User {
  email: string
  password: string
}

const users: User[] = []

// - At least 8 characters long.
// - Contains at least one uppercase letter.
// - Contains at least one lowercase letter.
// - Contains at least one digit.
// - Contains at least one special character (e.g., !@#$%^&*).
// - Does not contain whitespace.
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/ // Regular expression for strong password validation

// แสดง user
app.get('/users', (c) => {
  return c.json(users)
})

// สร้าง user
app.post('/common/sign-up', async (c) => {
  const data = await c.req.json()
  if(!data.email){
    return c.json({ message: 'Email is required' }, 400)
  }
  if (!emailValidator.validate(data.email)) {
    return c.json({ message: 'Email is invalid' }, 400)
  }
  if(!data.password){
    return c.json({ message: 'Password is required' }, 400)
  }
  if(!strongPassword.test(data.password)){
    return c.json({ message: 'Password is not strong enough' }, 400)
  }
  users.push(data)
  return c.json({ message: 'User created successfully' }, 201)
})

// สร้าง user ด้วย zod validator (https://zod.dev/)
app.post('/zod/sign-up', async (c) => {
  const data = await c.req.json()
  const schema = z.object({ // สร้าง schema
    email: z.string().email().trim().min(5), // ตรวจสอบ email
    password: z.string().min(8).regex(strongPassword, {message: 'Password is not strong enough'}), // ตรวจสอบ password
  })
  const parsed = schema.safeParse(data) // ตรวจสอบข้อมูล
  if (parsed.error) {
    return c.json({ message: parsed.error }, 400)
  }
  users.push(data)
  return c.json({ message: 'User created successfully' }, 201)
})

// สร้าง user ด้วย zod validator แบบ middleware ไม่แยกไฟล์
app.post('middleware/sign-up', zValidator('json', z.object({
  email: z.string().email().trim().min(5),
  password: z.string().min(8).regex(strongPassword, {message: 'Password is not strong enough'}),
})), async (c) => {
  const persed = c.req.valid('json')
  users.push(persed)
  return c.json({ message: 'User created successfully' }, 201)
})

// สร้าง user ด้วย zod validator แบบ middleware แบบแยกไฟล์ (แบบนี้ดีกว่าใช้ได้ซ้ำหลายที่)
app.post('middleware-file/sign-up', signUp, async (c) => {
  const persed = c.req.valid('json')
  users.push(persed)
  return c.json({ message: 'User created successfully' }, 201)
})

// แสดง user ตาม email
// ใช้ zod validator ในการตรวจสอบพารามิเตอร์
// ตรวจสอบว่า email เป็นรูปแบบที่ถูกต้องหรือไม่
app.get('/users/:email', zValidator('param', z.object({
  email: z.string().email().trim().min(5),
})), (c) => {
  const email = c.req.valid('param').email
  const user = users.find(u => u.email === email)
  if (!user) {
    return c.json({ message: 'User not found' }, 404)
  }
  return c.json(user)
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
