import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'

// ตั้งตัวแปร context ให้ได้ TypeScript https://hono.dev/docs/api/context#set-get
const app = new Hono<{
  Variables: { // กำหนดตัวแปร context ที่จะใช้ใน middleware
    notificationMessage: string | undefined
  }
}>()

// Middleware สำหรับล้าง Cookie Message หลังจาก next() คือได้รัน Handler เสร็จแล้ว
app.use(async (c, next) => {
  const notificationMessage = getCookie(c, 'notificationMessage') // คือการดึงค่า Cookie
  c.set('notificationMessage', notificationMessage) // คือการตั้งค่า context variable
  await next()
  // ลบ Cookie เมื่อเสร็จแล้ว
  if (notificationMessage) {
    deleteCookie(c, 'notificationMessage')
  }
})

app.get('/', (c) => {
  const theme = getCookie(c, 'theme') // ดึงค่า Cookie ที่ชื่อว่า theme
  const notificationMessage = c.get('notificationMessage') // ดึงค่า context variable ที่ตั้งไว้ใน middleware
  const css = `
    body.dark {
      background-color: black;
      color: white;
    }
    body.dark h1 {
      color: white;
    }
    `
    return c.html(
      <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Document</title>
      <style>{css}</style>
    </head>
    <body className={theme === 'dark' ? 'dark' : ''}>
      <h1>Theme switcher</h1>
      {notificationMessage && <p>Message: {notificationMessage}</p>}
      <ul>
        <li><a href="/switch-theme?theme=dark">Theme: Dark</a></li>
        <li><a href="/switch-theme?theme=light">Theme: Light</a></li>
      </ul>
    </body>
    </html>    
    )
})

// Route สำหรับเปลี่ยน Theme
// เมื่อคลิกที่ลิงก์ จะส่งค่า theme ผ่าน query string
app.get('/switch-theme', (c) => {
  const theme = c.req.query('theme')
  if (theme !== 'dark' && theme !== 'light') {
    throw new HTTPException(400, { message: 'Invalid theme' })
  }
    // c.res.headers.set('Set-Cookie', `theme=${theme}`)
  setCookie(c, 'theme', theme, {
    httpOnly: true, // ป้องกันการเข้าถึงจาก JavaScript
    secure: process.env.NODE_ENV === 'production', // ใช้ HTTPS ก็ต่อเมื่อรันบน Production
    sameSite: 'Lax', // ป้องกัน CSRF
    maxAge: 60 * 60 * 24 * 365, // 1 year (ไม่ควรตั้งนานเกิน 1 ปีกรณีที่ต้องการ Sesion ระยะยาว)
  })
  return c.redirect('/')
})

// Route สำหรับสร้าง Notification
// เมื่อคลิกที่ลิงก์ จะส่งค่า message ผ่าน path parameter
app.get('make-notification/:message', (c) => {
  const message = c.req.param('message')
  // c.res.headers.set('Set-Cookie', `notification=${message}`)
  setCookie(c, 'notificationMessage', message)
  return c.redirect('/')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
