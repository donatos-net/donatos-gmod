import type { serverApiSchema } from 'api-schema/src'
import type { donatosItem } from '@/donatos/item'
import type { netMessageToServerCallback } from '@/donatos/net'
import type { DonatosPlayer } from '@/player'
import type { DonatosUiTab } from '@/ui/main'
import type { ColorConfig } from '@/ui/ui-utils'
import type { ButtonParams, ThemedUiConfig } from '@/utils/themed-ui'

declare global {
	declare let donatos: {
		// server
		Item?: typeof donatosItem

		// client
		OpenUI?: (tab?: DonatosUiTab) => void
		NetMessageToServer?: typeof netMessageToServerCallback

		GetRemoteConfig?: () =>
			| serverApiSchema['server:get-config']['output']
			| undefined

		config?: {
			apiEndpoint?: string
			apiToken?: string
			autoUpdate?: boolean
			menuKeyBind?: KEY
			igsCompat?: boolean
		}
		dev?: {
			enabled?: boolean
			webUiUrl?: string
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
