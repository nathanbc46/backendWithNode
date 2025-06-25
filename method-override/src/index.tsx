import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { methodOverride } from "hono/method-override";
import { showRoutes } from 'hono/dev'

const app = new Hono();

interface Task {
  id: number;
  title: string;
  done: boolean;
}

const tasks: Task[] = [
  { id: 1, title: "Task 1", done: false },
  { id: 2, title: "Task 2", done: true },
  { id: 3, title: "Task 3", done: false },
];

// https://hono.dev/docs/middleware/builtin/method-override
app.use(methodOverride({ app })); // Enable method override middleware

app.get("/", (c) => {
  return c.html(
    <>
      <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css"
        rel="stylesheet"
        integrity="sha384-LN+7fdVzj6u52u30Kp6M/trliBMCMKTyK833zpbD+pXdCLuTusPj697FH4R/5mcr"
        crossorigin="anonymous"
      ></link>
      <h1>Tasks</h1>
      <ul>
        {tasks.map((t) => (
          <li>
            <span>
              {t.done ? "✅" : "❌"} {t.title}
            </span>
            <div style="display: inline-flex; gap: 0.25em; margin-left: 0.5em;">
              <form action={`/api/tasks/${t.id}/success`} method="post">
                <input type="hidden" name="_method" value="PATCH" />
                <button>Success</button>
              </form>
              <form action={`/api/tasks/${t.id}`} method="post">
                <input type="hidden" name="_method" value="DELETE" />
                <button>Delete</button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <form action="/api/tasks" method="post">
        <input type="text" name="title" placeholder="Please input" />
        <button type="submit">Add task</button>
      </form>
    </>
  );
});

app.get("/api/tasks", (c) => {
  return c.json({ data: tasks });
});

app.post("/api/tasks", async (c) => {
  let data: any;
  if (c.req.header("Content-Type")?.includes("application/json")) {
    data = await c.req.json();
  } else if (
    c.req.header("Content-Type")?.includes("application/x-www-form-urlencoded")
  ) {
    data = await c.req.parseBody();
  } else {
    throw new HTTPException(400, { message: "Unsupported Content-Type" });
  }
  tasks.push({ ...data, id: tasks.length + 1 });
  return c.req.header("Accept")?.includes("text/html") // If the request accepts HTML, redirect to the home page
    ? c.redirect("/")
    : c.json({ message: "Task added successfully", task: data }, 201); // If the request accepts JSON, return a JSON response
});

app.patch("/api/tasks/:id/success", (c) => {
  const id = parseInt(c.req.param("id"));
  const taskIndex = tasks.findIndex((t) => t.id === id);
  if (taskIndex === -1) {
    throw new HTTPException(404, { message: "Task not found" });
  }
  tasks[taskIndex].done = true;
  return c.req.header("Accept")?.includes("text/html")
    ? c.redirect("/")
    : c.json({ message: "Task updated" });
}); 

app.delete('/api/tasks/:id', (c) => {
  const id = c.req.param('id')
  const index = tasks.findIndex((t) => t.id === +id)
  if (index === -1) {
    throw new HTTPException(404, { message: 'Task not found' })
  }
  tasks.splice(index, 1)
  return c.req.header('Accept')?.includes('text/html') ? c.redirect('/') : c.json({ message: 'Task deleted' })
})

app.onError((err, c) => {
  const status = err instanceof HTTPException ? err.status : 500
  const accept = c.req.header('Accept')
  if (accept && accept.includes('text/html')) {
    return c.html(`<p>${err.message}</p>`)
  }
  return c.json({ message: err.message }, status)
})

showRoutes(app)

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
