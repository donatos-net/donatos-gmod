import { netMessageToClient } from '@/donatos/net'
import { remoteConfig } from '@/donatos/remote-config'
import { serverApiRequest } from '@/donatos/server-api'
import { log } from '@/utils/log'

export async function loadRemoteConfig() {
  log.info('Loading remote config...')
  const { isError, data, error } = await serverApiRequest('server:get-config', undefined)

  if (isError) {
    return
  }

  remoteConfig.value = data
  netMessageToClient(undefined, 'syncConfig', data)

  log.info('Received new remote config')
}
