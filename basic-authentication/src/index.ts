import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// https://hono.dev/docs/middleware/builtin/basic-auth
// ใช้ middleware basicAuth เพื่อป้องกันการเข้าถึงหน้าเว็บ
// โดยต้องใช้ username และ password ที่กำหนดไว้
app.get('/admin', basicAuth({ username: 'admin', password: 'password' }), (c) => {
  return c.text('Wellcome to the admin page!')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
