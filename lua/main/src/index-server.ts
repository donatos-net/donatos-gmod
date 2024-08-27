import { netMessageToClient } from '@/donatos/net'
import { fetchAddonReleases, installRelease } from '@/donatos/releases'
import { loadRemoteConfig } from '@/donatos/utils/load-remote-config'
import { meta } from '@/meta'
import { donatosHookId } from '@/utils/addon'
import { log } from '@/utils/log'

donatosBootstrap?.addonVersionConVar?.SetString(meta.VERSION)

loadRemoteConfig()

hook.Add('PlayerInitialSpawn', donatosHookId('player_initial_spawn'), (ply: Player) => {
  if (ply.IsBot()) {
    return
  }

  ply
    .Donatos()
    ._sLoadRemoteData()
    .then(() => ply.Donatos()._sOnPlayerJoined())
})

hook.Add('PlayerSay', donatosHookId('player_say'), (ply: Player, text: string) => {
  if (string.lower(text) === '/donate') {
    netMessageToClient(ply, 'openUi', undefined)
    return ''
  }
})

concommand.Add('donatos_update', async (ply: Player) => {
  if (IsValid(ply) && !ply.IsSuperAdmin()) {
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

  const dlResult = await installRelease(latestRelease)

  if (dlResult.isError) {
    log.error(`Не удалось скачать релиз ${latestRelease.name}: ${dlResult.error}`)
    return
  }

  donatosBootstrap?.addonVersionConVar?.SetString(latestRelease.name)
  netMessageToClient(undefined, 'updateAddon', latestRelease.name)

  log.info('Подгружаю bundle.lua')
  RunString(dlResult.data, 'donatos/bundle.lua')
})

async function checkForAddonUpdates() {
  const runningVersion = meta.VERSION
  if (runningVersion === '$VERSION$') {
    return
  }

  log.info('Проверка обновлений аддона...')

  const result = await fetchAddonReleases()
  if (result.isError) {
    log.error(`Не удалось проверить обновления аддона: ${result.error}`)
    return
  }

  const latestRelease = result.data.releases[0]
  if (!latestRelease) {
    return
  }

  if (latestRelease.name === runningVersion) {
    log.info('Обновлений нет.')
    return
  }

  log.info(`Доступно обновление аддона: ${latestRelease.name}`)

  if (donatos.config?.autoUpdate) {
    log.info('Устанавливаю обновление аддона, так как включено авто-обновление.')
    const result = await installRelease(latestRelease)

    if (result.isError) {
      log.error(`Не удалось установить обновления аддона: ${result.error}`)
      return
    }

    donatosBootstrap?.addonVersionConVar?.SetString(latestRelease.name)
    netMessageToClient(undefined, 'updateAddon', latestRelease.name)

    log.info('Подгружаю bundle.lua')
    RunString(result.data, 'donatos/bundle.lua')
  }
}

checkForAddonUpdates()
