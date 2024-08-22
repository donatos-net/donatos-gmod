import type { z } from 'zod'
import type { serverApiSchema as schema } from './api-schema'

export type serverApiSchema = {
  [key in keyof typeof schema]: {
    input: z.infer<(typeof schema)[key]['input']>
    output: z.infer<(typeof schema)[key]['output']>
  }
}
