import type { donatosItem } from '@/donatos/item'
import type { DonatosPlayer } from '@/player'
import type { ColorConfig } from '@/ui/ui-utils'
import type { ButtonParams, ThemedUiConfig } from '@/utils/themed-ui'

declare global {
  declare let donatos: {
    Item?: typeof donatosItem
    UI?: () => void
    UpdateTheme?: () => void

    config?: {
      apiEndpoint?: string
      apiToken?: string
      autoUpdate?: boolean
      menuKeyBind?: KEY
      igsCompat?: boolean
    }
    uiConfig?: {
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
        localRelease?: { id?: number }
        releaseConVar?: ConVar
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
