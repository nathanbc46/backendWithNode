import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { config } from 'dotenv'
import PgBoss from 'pg-boss'
import { createTransport, getTestMessageUrl } from 'nodemailer'

config()
const app = new Hono()
const boss = new PgBoss(process.env.DATABASE_URL)

await boss.start() // เริ่มใช้งาน PgBoss
await boss.createQueue('email') // สร้างคิวสำหรับส่งอีเมล ที่ชื่อว่า email
await boss.work<{ email: string; subject: string; html: string; }>('email', { batchSize: 5 }, async (jobs) => { // ทํางานในคิวที่ชื่อว่า email, batchSize คือ จํานวนอีเมลที่จะส่งในแต่ละครั้ง
  await Promise.all(jobs.map(async (job) => { // ส่งอีเมลแต่ละอัน
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: job.data.email,
      subject: job.data.subject,
      html: job.data.html
    })
     if (process.env.NODE_ENV !== 'production') {
      console.log('Message sent: %s', info.messageId)
      console.log('Preview URL: %s', getTestMessageUrl(info))
    } else {
       console.log(`Email ${job.data.subject} sent to ${job.data.email}`)
    }
  }))
})

// สร้างตัวส่งอีเมลด้วย Nodemailer
const transport = createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
})


app.post('/send-mail', async (c) => {
  const data = await c.req.json() as { email: string; subject: string; html: string; }
  const id = await boss.send('email', data) // ส่งอีเมลไปยังคิว ชื่อที่อยู่่ใน createQueue
  return c.json({ success: true, message: `Created job ${id} in queue email` })
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
