import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()
const prisma = new PrismaClient()

// ดึงสินค้า แบบ Pagination
app.get('/api/products', async (c) => {
  const page = c.req.query('page') || 1
  const perPage = c.req.query('perPage') || 10
  // const products = await prisma.product.findMany()
  // const total = await prisma.product.count()
  const [products, total] = await Promise.all([ // รันแบบคู่ขนานพร้อมกันไปเลย ไม่ต้องทำแบบ comment ด้านบน
    prisma.product.findMany({
      skip: (Number(page) - 1) * Number(perPage),
      take: Number(perPage),
      orderBy: {
        updatedAt: 'desc'
      },
      include: {
        category: true // ดึง category มาด้วย
      }
    }),
    prisma.product.count()
  ])
  return c.json({
    total,
    currentPage: Number(page),
    itemPerPage: Number(perPage),
    data: products
  })
})

// สร้างสินค้า
app.post('/api/products', async (c) => {
  const json = await c.req.json()
  const product = await prisma.product.create({
    data: {
      title: json.title,
      price: json.price,
      quantity: json.quantity,
      categoryId: json.categoryId
    }
  })
  return c.json({
    message: 'Product created successfully',
    data: product
  }, 201)
})

// ดึงสินค้าตาม ID
app.get('/api/products/:id', async (c) => {
  const id = c.req.param('id')
  const product = await prisma.product.findUnique({
    where: {
      id: Number(id)
    },
    include: {
      category: true // ดึง category มาด้วย
    }
  })
  if (!product) {
    throw new HTTPException(404, { message: 'Product not found' })
  }
  return c.json(product)
})

// อัพเดทสินค้าตาม ID
app.put('/api/products/:id', async (c) => {
  const id = c.req.param('id') //ดึงค่า id จาก URL parameters
  const json = await c.req.json() //รับข้อมูล JSON จาก request body
  const product = await prisma.product.update({
    where: {
      id: Number(id)
    },
    data: {
      title: json.title,
      price: json.price,
      quantity: json.quantity,
      categoryId: json.categoryId
    }
  })
  return c.json({
    message: 'Product updated successfully',
    data: product
  })
})

// อัพเดท Quantity สินค้าตาม ID
app.patch('/api/products/:id/quantity', async (c) => {
  const id = Number(c.req.param('id')) //ดึงค่า id จาก URL parameters
  const json = await c.req.json() as { quantity: number } //รับข้อมูล JSON จาก request body และแปลงเป็น type { quantity: number }
  const product = await prisma.product.update({
    where: {
      id: Number(id)
    },
    data: {
      quantity: json.quantity
    }
  })
  return c.json({
    message: 'Product quantity updated successfully',
    data: product
  })
})

// ลบสินค้าตาม ID
app.delete('/api/products/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const product = await prisma.product.delete({
    where: {
      id: Number(id)
    }
  })
  return c.json({
    message: 'Product deleted successfully',
    data: product
  })
})

// จัดการ error
app.onError((err, c) => {
  const status = err instanceof HTTPException ? err.status : 500 //ถ้า error ไม่ใช่ HTTPException ให้สถานะเป็น 500
  return c.json({ success: false, error: err.message, status: status }, status) //ส่งข้อมูล error กลับไปในรูปแบบ JSON
})


serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
