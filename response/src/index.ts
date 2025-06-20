import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

app.get('/sey/:message', (c) => {
  const message = c.req.param('message')
  const accept = c.req.header('Accept') || 'text/plain'

  if (accept.includes('application/json')) { //พบข้อความที่ค้นหาใน accept (string) นี้หรือไม่
    return c.json({ message }) //ส่งออกไปเป็น json
  } else if (accept.includes('text/html')) {
    return c.html(`<h1 style="color: red;">${message}</h1>`) //ส่งออกเป็น html
  } else if (accept.includes('text/plain') || accept.includes('*/*')) {
    return c.text(message)
  }
  return c.text('Unsupported Media Type', 415) 
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
