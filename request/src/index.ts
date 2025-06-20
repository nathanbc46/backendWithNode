import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()
//ประกาศฟังก์ชัน printSumResult ที่รับค่า a และ b เป็น number และส่งค่าเป็น string
function printSumResult(a: number, b: number): string {
  return `Result: ${a} + ${b} = ${a + b} `
}

app.get('/', (c) => {
  return c.html(`
    <h1>Sum Calculator</h1>

    <hr>

    <h2>application/x-www-form-urlencoded</h2>
    <form action="/sum" method="post">
      <input type="number" name="a" id="a1" placeholder="a" />
      <input type="number" name="b" id="b1" placeholder="b" />
      <button type="submit">Submit</button>
    </form>

    <hr>

    <h2>multipart/form-data</h2>
    <form action="/sum" method="post" enctype="multipart/form-data">
      <input type="number" name="a" id="a2" placeholder="a" />
      <input type="number" name="b" id="b2" placeholder="b" />
      <button type="submit">Submit</button>
    </form>

    <hr>

    <h2>application/json</h2>
    <form id="jsonForm">
      <input type="number" name="a" id="a3" placeholder="a" />
      <input type="number" name="b" id="b3" placeholder="b" />
      <button type="submit">Submit</button>
    </form>
    <input id="result" type="text" placeholder="Wait for result..." readonly />

    <script>
      const form = document.getElementById('jsonForm')
      form.addEventListener('submit', async (event) => {
        event.preventDefault()
        const data = {
          a: document.getElementById('a3').value,
          b: document.getElementById('b3').value,
        }
        const response = await fetch('/sum', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })
        const result = await response.text()
        document.getElementById('result').value = result
      })
    </script>
    `)
})

app.post('/sum', async (c) => {
  const contentType = c.req.header('Content-Type')
  if (!contentType) {
    return c.text('Content-Type headse is required', 400)
  }
  //json
  if (contentType.includes('application/json')) {
    const data = await c.req.json()
    return c.text(printSumResult(Number(data.a), Number(data.b)))
  }

  //x-www-form-urlencoded
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const data = await c.req.parseBody()
    return c.text(printSumResult(Number(data.a), Number(data.b)))
  }

  //multipart
  if (contentType.includes('multipart/form-data')) {
    const data = await c.req.parseBody()
    return c.text(printSumResult(Number(data.a), Number(data.b)))
  }

  //plain
  if (contentType.includes('text/plain')) {
    const data = await c.req.text()
    const [a, b] = data.split(' ')
    return c.text(printSumResult(Number(a), Number(b)))
  }

  return c.text('Unsupported Content-Type', 415)

})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
