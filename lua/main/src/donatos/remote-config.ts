import { persistedVar } from '@/utils/addon'
import type { serverApiSchema } from 'api-schema/src'

export const remoteConfig = persistedVar<{ value: undefined | serverApiSchema['server:get-config']['output'] }>(
  'remote-config',
  { value: undefined },
)
