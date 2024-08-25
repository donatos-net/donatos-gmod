import { type ClientNetHandler, clientNonce } from '@/donatos/net'
import { fetchAddonReleases, installRelease } from '@/donatos/releases'
import { remoteConfig } from '@/donatos/remote-config'
import { donatosUi } from '@/ui/main'
import colors from '@/utils/colors'
import { log } from '@/utils/log'
import type { serverApiSchema } from 'api-schema/src'

// server -> client
export const handleClientMessage = {
  resultFromServer: (input: [number, unknown]) => {
    clientNonce.handlers[input[0]]?.(input[1])
    delete clientNonce.handlers[input[0]]
  },

  updateAddon: async (releaseName: string) => {
    const response = await fetchAddonReleases()

    if (response.isError) {
      log.error(`Не удалось получить список релизов: ${response.error}`)
      return
    }

    const release = response.data.releases.find((r) => r.name === releaseName)

    if (!release) {
      log.error(`Релиз ${releaseName} не найден.`)
      return
    }

    const dlResult = await installRelease(release)

    if (dlResult.isError) {
      log.error(`Не удалось скачать релиз ${release.name}: ${dlResult.error}`)
      return
    }

    log.info('Подгружаю bundle.lua')
    RunString(dlResult.data, 'donatos/bundle.lua')
  },

  openUi: () => donatosUi(),
  print: (input: [number, unknown][]) => {
    const deserialized: (string | Player | Color)[] = []

    for (const [type, value] of input) {
      if (type === 0) {
        deserialized.push(value as string)
      } else if (type === 1) {
        deserialized.push(Player(value as number))
      } else if (type === 2) {
        deserialized.push(Color(...(value as [number, number, number])))
      }
    }

    chat.AddText(colors.BLUE_6, '[Donatos] ', colors.BLUE_1, ...deserialized)
  },
  syncConfig: async (input: serverApiSchema['server:get-config']['output']) => {
    remoteConfig.value = input
  },
  syncPlayer: async (input: serverApiSchema['server:get-player']['output']) => {
    LocalPlayer().Donatos().RemoteData = input
  },
} satisfies Record<string, ClientNetHandler>

if (CLIENT) {
  net.Receive('donatos', () => {
    const [action, data] = util.JSONToTable(net.ReadString()) as [keyof typeof handleClientMessage, unknown]
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    handleClientMessage[action]?.(data as any)
  })
}
