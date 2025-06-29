import type { donatosItem } from '@/donatos/item'
import type { netMessageToServerCallback } from '@/donatos/net'
import type { DonatosPlayer } from '@/player'
import type { ColorConfig } from '@/ui/ui-utils'
import type { ButtonParams, ThemedUiConfig } from '@/utils/themed-ui'
import type { serverApiSchema } from 'api-schema/src'

declare global {
  declare let donatos: {
    // server
    Item?: typeof donatosItem

    // client
    OpenUI?: () => void
    NetMessageToServer?: typeof netMessageToServerCallback

    // shared
    UpdateTheme?: () => void
    GetRemoteConfig?: () => serverApiSchema['server:get-config']['output'] | undefined

    config?: {
      apiEndpoint?: string
      apiToken?: string
      autoUpdate?: boolean
      menuKeyBind?: KEY
      igsCompat?: boolean
      gift?: {
        model?: string
      }
    }
    uiConfig?: {
      customUi?: (this: void, tab?: string) => void
      menuSize?: [number, number]
      theme?: ThemedUiConfig
      components?: {
        shopItem?: ColorConfig
        headerNavBtn?: ButtonParams
      }
    }
  }

  declare let donatosBootstrap:
    | {
        version?: number
        addonVersionConVar?: ConVar
        bundleSha256ConVar?: ConVar
        addonApiUrl?: string
      }
    | undefined

  declare let _donatos: {
    _timersUuid?: string
    _persistedVars: Record<string, unknown>
  }

  interface Player {
    _donatos?: DonatosPlayer
    Donatos(): DonatosPlayer
  }
}
