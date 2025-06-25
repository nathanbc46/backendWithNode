import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/ // Regular 

export default zValidator('json', z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(strongPassword, {message: 'Password is not strong enough'}),
}))