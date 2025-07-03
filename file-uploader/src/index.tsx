import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import sharp from "sharp"; // ใช้ sharp สำหรับการปรับขนาดและบีบอัดรูปภาพ
import { parse } from "node:path"; // ใช้ parse จาก path เพื่อแยกชื่อไฟล์
import { createWriteStream } from "node:fs"; // ใช้ createWriteStream จาก fs เพื่อเขียนไฟล์ลงดิสก์
import { Readable } from "node:stream"; // ใช้ Readable จาก stream เพื่อสร้าง stream สำหรับการอ่านไฟล์
import { pipeline } from "node:stream/promises"; // ใช้ pipeline จาก stream/promises เพื่อจัดการกับ stream

const app = new Hono();

app.get("/", (c) => {
  return c.html(
    <>
      <h1>File Uploader</h1>
      <form action="/upload/avatar" method="post" enctype="multipart/form-data">
        <input type="file" name="file" accept="image/*" required />
        <button type="submit">Upload</button>
      </form>
    </>
  );
});

app.post('/upload/avatar', async (c) => {
  const body = await c.req.parseBody()
  if (!(body.file instanceof File)) { // Check if the file is valid
    throw new HTTPException(400, { message: 'Invalid file upload' });
  }

  const output = `uploads/${Date.now()}-${parse(body.file.name).name}.jpg` // Save the file with a timestamp and the original name
  const webReadStream = body.file.stream(); // คือ สร้าง stream สำหรับอ่านไฟล์จาก body.file
  const nodeReadStream = Readable.from(webReadStream as any); // คือ แปลง web stream เป็น node stream 
  const sharpStream = sharp().resize(200, 200).jpeg({ quality: 80 }); //คือ สร้าง stream สำหรับปรับขนาดและบีบอัดรูปภาพ โดยใช้ sharp
  const writeStream = createWriteStream(output); // คือ สร้าง stream สำหรับเขียนไฟล์
  //ควรใช้ Stream แทนการอ่าน Buffer เพื่อลดการใช้หน่วยความจำ
  await pipeline(nodeReadStream, sharpStream, writeStream) // คือ ใช้ pipeline จาก stream/promises เพื่อจัดการกับ stream
  return c.json({ message: 'File uploaded successfully', path: output })
})

// Error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  return c.json({ error: 'Internal Server Error' }, 500);
})

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
