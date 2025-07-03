import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import sharp from "sharp"; // ใช้ sharp สำหรับการปรับขนาดและบีบอัดรูปภาพ
import { parse } from "node:path"; // ใช้ parse จาก path เพื่อแยกชื่อไฟล์
import { Readable } from "node:stream"; // ใช้ Readable จาก stream เพื่อสร้าง stream สำหรับการอ่านไฟล์
import { pipeline } from "node:stream/promises"; // ใช้ pipeline จาก stream/promises เพื่อจัดการกับ stream
import s3UploadStream from "s3-upload-stream"
import AWS from "aws-sdk"
import { config } from "dotenv"

config()
const app = new Hono()

AWS.config.s3 = { // ตั้งค่าการเชื่อมต่อกับ S3 ผ่าน AWS SDK เพื่อใช้ในการอัปโหลดไฟล์
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  }
}
const s3Stream = s3UploadStream(new AWS.S3() as any) // สร้าง stream สําหรับอัปโหลดไฟล์ไปยัง S3

app.post('/upload/avatar', async (c) => {
  const body = await c.req.parseBody()
  if (!(body.file instanceof File)) { // ตรวจสอบว่าไฟล์ที่ถูกอัปโหลดมีชนิดที่ถูกต้องหรือไม่
    throw new HTTPException(400, { message: 'Invalid file upload' })
  }

  const output = `uploads/${Date.now()}-${parse(body.file.name).name}.jpg` // สร้างชื่อไฟล์ใหม่โดยใช้ timestamp และชื่อไฟล์เดิม
  const sharpStream = sharp().resize(200, 200).jpeg({ quality: 80 }) // สร้าง stream สําหรับปรับขนาดและบีบอัดรูปภาพ
  const webReadStream = body.file.stream() // สร้าง stream สําหรับอ่านไฟล์จาก body.file
  const nodeReadStream = Readable.from(webReadStream as any) // แปลง web stream เป็น node stream
  const upload = s3Stream.upload({ // สร้าง stream สําหรับอัปโหลดไฟล์ไปยัง S3
    Bucket: process.env.S3_BUCKET,
    Key: output
  })
  await pipeline(nodeReadStream, sharpStream, upload) // ใช้ pipeline จาก stream/promises เพื่อจัดการกับ stream
  return c.json({ message: 'Avatar uploaded successfully', path: output })
})

app.onError((err, c) => { // จัดการข้อผิดพลาดที่เกิดขึ้นในแอปพลิเคชัน
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
