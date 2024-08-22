import { netMessageToClient } from '@/donatos/net'
import { loadRemoteConfig } from '@/donatos/utils/load-remote-config'
import { donatosHookId } from '@/utils/addon'

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
