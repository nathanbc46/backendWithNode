import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { compress } from 'hono/compress'

const app = new Hono()

const longText = 'abc\n'.repeat(1000) // คือข้อความยาวที่เราจะใช้ทดสอบการบีบอัด

app.get('/without-compress/short', (c) => {
  return c.text('Hello Hono!')
})

app.get('/without-compress/long', (c) => {
  return c.text(longText)
})

// https://hono.dev/docs/middleware/builtin/compress
// ใช้ middleware compress เพื่อบีบอัดการตอบสนอง
app.get('/with-compress/short', compress(), (c) => {
  return c.text('Hello Hono!')
})

// ใช้ middleware compress เพื่อบีบอัดการตอบสนองสำหรับข้อความยาว
app.get('/with-compress/long', compress(), (c) => {
  return c.text(longText)
})


serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
