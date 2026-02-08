import { DonatosClientPlayer, donatosPlayerClient } from '@/player/client'
import { DonatosServerPlayer, donatosPlayerServer } from '@/player/server'
import type { DonatosSharedPlayer } from '@/player/shared'

export type DonatosPlayer = DonatosSharedPlayer
export { donatosPlayerClient, donatosPlayerServer }

export const DonatosPlayer = (
	SERVER ? DonatosServerPlayer : DonatosClientPlayer
) as typeof DonatosSharedPlayer
