import type { FC } from "hono/jsx"

export const LayoutApp: FC = ({ children }) => {
    return(
     <html>
      <head>
        <title>My App</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-LN+7fdVzj6u52u30Kp6M/trliBMCMKTyK833zpbD+pXdCLuTusPj697FH4R/5mcr" crossorigin="anonymous"></link>
      </head>
      <body>
        <nav>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/create/employee">Create Employee</a></li>
          </ul>
        </nav>

        <main>
          {children}
        </main>
      </body>
    </html>       
    )
}