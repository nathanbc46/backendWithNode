import { serve } from '@hono/node-server'
import { Hono } from 'hono'

type status = 'active' | 'inactive' | 'pending' //กำหนด type status เป็น string ที่มีค่าเป็น 'active', 'inactive', หรือ 'pending'

interface Product {
  id: number
  name: string
  price: number,
  quantity: number,
  status: status,
  description?: string //ตัวเลือกที่ไม่จำเป็นต้องมี
}

//กำหนดตัวแปล products และกำหนด type เป็น Product[] อิงจาก interface ที่สร้างขึ้น
//เก็บข้อมูลแบบผสม Array of Object (https://www.notion.so/nathanbc/JavaScript-1-2027d1f7a6468063b23ad0580a340cc8?source=copy_link#2037d1f7a646806eaef3d25a8b247469)
const products: Product[] = [
  { id: 1, name: 'Product A', price: 100, quantity: 50, status: 'active', description: 'This is product A' },
  { id: 2, name: 'Product B', price: 200, quantity: 30, status: 'inactive', description: 'This is product B' },
  { id: 3, name: 'Product C', price: 150, quantity: 20, status: 'active' },
  { id: 4, name: 'Product D', price: 250, quantity: 10, status: 'pending' },
]

const app = new Hono()

//แสดงสินค้าทั้งหมด
app.get('/products', (c) => {
  return c.json({ data: products }) //ส่งข้อมูล products กลับไปในรูปแบบ JSON
})

//เพิ่มสินค้าใหม่
//ใช้ async/await เพื่อรอการรับข้อมูลจาก request body
app.post('/products', async (c) => {
  //รับข้อมูล JSON จาก request body และแปลงเป็น type Product (https://www.notion.so/nathanbc/TypeScript-JavaScript-20f7d1f7a64680a480f7d645e128db26?source=copy_link#2107d1f7a64680149258f17496ca3548)
  const product = await c.req.json() as Product

  //การรวม Array และ Object (…) (https://www.notion.so/nathanbc/JavaScript-2-2037d1f7a646805cb55fe419c7246311?source=copy_link#2047d1f7a6468041bb85e2761ee8bf14)
  products.push({ ...product, id: products.length + 1 }) //เพิ่มข้อมูล product ใหม่เข้าไปใน products โดยกำหนด id เป็นจำนวนของ products ปัจจุบัน + 1
  return c.json({ message: 'Product added successfully', data: products }, 201)
})

//แสดงสินค้าตาม ID
app.get('/products/:id', (c) => {
  const id = Number(c.req.param('id')) //ดึงค่า id จาก URL parameters และแปลงเป็นตัวเลข
  const product = products.find((p) => p.id === id) //ค้นหาข้อมูล product ตาม id ที่ระบุใน URL
  if (!product) {
    return c.json({ message: 'Product not found' }, 404) //ถ้าไม่พบ product ให้ส่งข้อความว่าไม่พบ
  }
  return c.json({ data: product }) //ถ้าพบ product ให้ส่งข้อมูลกลับ
})

//อัพเดทสินค้าตาม ID
app.put('/products/:id', async (c) => {
    const id = Number(c.req.param('id')) //ดึงค่า id จาก URL parameters และแปลงเป็นตัวเลข
    const product = await c.req.json() as Product ///รับข้อมูล JSON จาก request body และแปลงเป็น type Product
    const index = products.findIndex((p) => p.id === id) //ค้นหาตำแหน่งของ product ที่ต้องการแก้ไข
    if (index === -1) {
      return c.json({ message: 'Product not found' }, 404) //ถ้าไม่พบ product ให้ส่งข้อความว่าไม่พบ
    }
    console.log('index', index)
    products[index] = { ...product, id } //อัพเดตข้อมูล product ที่ตำแหน่ง index ที่พบ โดยใช้ข้อมูลใหม่ที่ส่งมาและรักษา id เดิม
    return c.json({ message: 'Product updated successfully', data: products[index] }) //
})

//อัพเดท Status สินค้าตาม ID
app.patch('/products/:id/status', async (c) => {
  const id = Number(c.req.param('id')) //ดึงค่า id จาก URL parameters
  const status = await c.req.json() as { status: status } //รับข้อมูล JSON จาก request body และแปลงเป็น type { status: status }
  const index = products.findIndex((p) => p.id === id)
  if (index === -1) {
    return c.json({ message: 'Product not found'}, 404)
  }
  products[index] = { ...products[index], status: status.status }
  //products[index].status = status.status //อัพเดตสถานะของ product ที่ตำแหน่ง index ที่พบ
  return c.json({ message: 'Product status updated successfully', data: products[index] })
})

//อัพเดท Quantity สินค้าตาม ID
app.patch('/products/:id/quantity', async (c) => {
  const id = Number(c.req.param('id')) //ดึงค่า id จาก URL parameters
  const quantity = await c.req.json() as { quantity: number } //รับข้อมูล JSON จาก request body และแปลงเป็น type { quantity: number }
  const index = products.findIndex((p) => p.id === id)
  if (index === -1) {
    return c.json({ message: 'Product not found'}, 404)
  }
  products[index] = { ...products[index], quantity: quantity.quantity }
  //products[index].quantity = quantity.quantity //อัพเดตสถานะของ product ที่ตำแหน่ง index ที่พบ
  return c.json({ message: 'Product quantity updated successfully', data: products[index] })
})

//ลบสินค้าตาม ID
app.delete('/products/:id', (c) => {
  const id = Number(c.req.param('id'))
  const index = products.findIndex((p) => p.id === id) //ค้นหาตำแหน่งของ product ที่ต้องการลบ
  if (index === -1) {
    return c.json({ message: 'Product not found' }, 404) //ถ้าไม่พบ product ให้ส่งข้อความว่าไม่พบ
  }
  //splice คือการลบข้อมูลใน Array ตามตำแหน่งที่ระบุ
  //https://www.notion.so/nathanbc/JavaScript-2-2037d1f7a646805cb55fe419c7246311?source=copy_link#2097d1f7a64680c89d1ed9eefd69f8ab
  products.splice(index, 1) //ลบ product ที่ตำแหน่ง index ที่พบ 
  return c.json({ message: 'Product deleted successfully', data: products }) 
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
