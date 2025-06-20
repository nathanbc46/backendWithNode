import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()

interface Movie {
  id: number
  title: string
  year: number
  rating: number
}

const movies: Movie[] = [
  { id: 1, title: 'The Shawshank Redemption', year: 1994, rating: 9.3 },
  { id: 2, title: 'The Godfather', year: 1972, rating: 9.2 },
  { id: 3, title: 'The Dark Knight', year: 2008, rating: 9.0 },
  { id: 4, title: 'The Godfather: Part II', year: 1974, rating: 9.0 },
  { id: 5, title: '12 Angry Men', year: 1957, rating: 8.9 },
]

app.get('/api/movie', (c) => {
  return c.json(movies)
})

app.get('/api/movie/:id', (c) => {
  const id = c.req.param('id')
  if (!/^\d+$/.test(id)) { //คำสั่ง /^\d+$/.test(id) ใน JavaScript เป็นการตรวจสอบว่า ตัวแปร id เป็นตัวเลขทั้งหมดหรือไม่ (ไม่มีตัวอักษรหรือสัญลักษณ์อื่นเจือปน)
    throw new HTTPException(400, { message: 'Invalid ID' })
  }

  const movie = movies.find((m) => m.id === +id) //คำสั่ง +id ใน JavaScript เป็นการแปลงค่า id เป็นตัวเลข
  if (!movie) {
    throw new HTTPException(404, { message: 'Movie not found' })
  }
  return c.json(movie)

})

app.get('/', (c) => {
  return c.html(`
     <h1>Add movie as json</h1>
    <form action="/movies" method="post" >
      <textarea name="movie" cols="30" rows="10">{
  "title": "",
  "year": 0,
  "rating": 0
}</textarea>
      <button type="submit">Add</button>
    </form>

    <hr>   
    <ul>
    ${movies.map((m) => `<li>${m.title} (${m.year}) - ${m.rating}</li>`).join('')}
    </ul>
    `)
})

//หากมี error app.onError((err, c) จะจัดการให้
app.post('/movies' , async(c) => {
  const data = await c.req.parseBody()
  const movie = JSON.parse(String(data.movie)) as Movie //JSON.parse คือฟังก์ชันใน JavaScript ที่ใช้สำหรับ แปลง (parse) ข้อมูลจากรูปแบบ JSON (JavaScript Object Notation) ให้กลายเป็น JavaScript object ที่สามารถใช้งานได้จริงในโค้ด (JSON.parse(jsonString))
  movies.push(movie)
  return c.redirect('/')
})

//เขียน error handling ให้ละเอียดมากยิ่งขึ้น
app.post('/movies-add', async (c) => {
  const data = await c.req.parseBody()
  let movie: any
  try {
    movie = JSON.parse(String(data.movie))
  } catch (error) {
    throw new HTTPException(400, { message: 'Invalid JSON' })
  }
  movies.push(movie)
  return c.redirect('/')
})

// error handling สามารถมาปรับแต่งการแสดง error ตรงนี้ได้เลยที่เดียว
app.onError((err, c) => {
  const status = err instanceof HTTPException ? err.status : 500
  const accept = c.req.header('Accept')
  if (accept && accept.includes('application/json')) { //หากเป็นแบบ json
    return c.json({ success: false, error: err.message, status: status }, status)
  }
  return c.text(err.message, status)
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
