import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createTransport, getTestMessageUrl } from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

const app = new Hono()

// คือการตั้งค่า Nodemailer สำหรับส่งอีเมล
const transporter = createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

app.post('/send-mail', async (c) => {
  console.log(process.env.SMTP_USER, process.env.SMTP_PASS)
  const { email, subject, text } = await c.req.json()
  if (!email || !subject || !text) {
    throw new HTTPException(400, { message: 'Email, subject, and text are required' })
  }
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject,
    text,
  })
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Preview URL: ${getTestMessageUrl(info)}`)
  }
  return c.json({ success: true })
})

app.onError((err, c) => {
  // console.error(err) // <-- ลบบรรทัดนี้หรือคอมเมนต์ไว้
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
