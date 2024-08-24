import { netMessageToClient } from '@/donatos/net'
import { downloadRelease, fetchAddonReleases } from '@/donatos/releases'
import { loadRemoteConfig } from '@/donatos/utils/load-remote-config'
import { donatosHookId } from '@/utils/addon'
import { log } from '@/utils/log'

loadRemoteConfig()

hook.Add('PlayerInitialSpawn', donatosHookId('player_initial_spawn'), async (ply: Player) => {
  if (ply.IsBot()) {
    return
  }

  await ply.Donatos()._sLoadRemoteData()
  ply.Donatos()._sOnPlayerJoined()
})

hook.Add('PlayerSay', donatosHookId('player_say'), (ply: Player, text: string) => {
  if (string.lower(text) === '/donate') {
    netMessageToClient(ply, 'openUi', undefined)
    return ''
  }
})

concommand.Add('donatos_update', async (ply: Player) => {
  if (!ply.IsSuperAdmin()) {
    return
  }

  log.info('Проверяю обновления...')

  const response = await fetchAddonReleases()

  if (response.isError) {
    log.error(`Не удалось получить список релизов: ${response.error}`)
    return
  }

  // const localRelease = getLocalAddonRelease()
  const latestRelease = response.data.releases[0]

  if (!latestRelease) {
    log.error('Нет доступных релизов.')
    return
  }

  /*if (localRelease && localRelease.id === latestRelease.id) {
    log.info(`Установленная версия аддона (${latestRelease.name}) - последняя.`)
    return
  }*/

  const dlResult = await downloadRelease(latestRelease)

  if (dlResult.isError) {
    log.error(`Не удалось скачать релиз ${latestRelease.name}: ${dlResult.error}`)
    return
  }

  donatosBootstrap?.releaseConVar?.SetString(latestRelease.id.toString())
  netMessageToClient(undefined, 'updateAddon', latestRelease.id)

  log.info('Подгружаю bundle.lua')
  RunString(dlResult.data, 'donatos/bundle.lua')
})
