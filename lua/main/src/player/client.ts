import { DonatosSharedPlayer } from '@/player/shared'

export class DonatosClientPlayer extends DonatosSharedPlayer {}

export function donatosPlayerClient(p: Player): DonatosClientPlayer {
	return p.Donatos() as DonatosClientPlayer
}
