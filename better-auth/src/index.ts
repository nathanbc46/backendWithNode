import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createMiddleware } from 'hono/factory'
import { auth } from './auth.js'
import { showRoutes } from 'hono/dev'


const app = new Hono()

app.on(['GET', 'POST'], '/api/auth/**', (c) => auth.handler(c.req.raw)) // Handle all auth requests with the auth middleware

// คือ การสร้างมิดเดิลแวร์ที่ต้องการการยืนยันตัวตน
const needAuth = createMiddleware<{ 
  Variables: {
    user: {
      id: string
      email: string
      emailVerified: boolean
      name: string
      createdAt: Date
      updatedAt: Date
      image?: string | null | undefined
    }
  }
}>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  c.set('user', session.user)
  await next()
})

app.get('/me', needAuth, (c) => {
  // เมื่อผู้ใช้เข้าสู่ระบบแล้ว จะสามารถเข้าถึงข้อมูลผู้ใช้ได้
  const user = c.get('user')
  if (!user) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  // ส่งข้อมูลผู้ใช้กลับไปยังผู้ใช้
  return c.json({ data: user })
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  return c.json({ error: 'Internal Server Error' }, 500)
})

showRoutes(app)

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
