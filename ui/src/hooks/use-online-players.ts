import { useQuery } from '@tanstack/react-query'
import {
	isInGame,
	isMockEnvironment,
	netMessageToServer,
} from '@/lib/gmod-bridge'
import type { OnlinePlayer } from '@/types/donatos'

const mockOnlinePlayer: OnlinePlayer = {
	externalId: '765611979602879',
	name: 'Player',
	avatarUrl:
		'https://avatars.fastly.steamstatic.com/c5d56249ee5d28a07db4ac9f7f60af961fab5426_full.jpg',
}

export function useOnlinePlayers() {
	const inGame = isInGame()
	const useMock = isMockEnvironment()

	return useQuery({
		queryKey: ['online-players'],
		enabled: inGame || useMock,
		queryFn: async (): Promise<OnlinePlayer[]> => {
			if (useMock) {
				await new Promise((resolve) => setTimeout(resolve, 150))
				return Array(100)
					.fill(null)
					.map(() => ({
						...mockOnlinePlayer,
						externalId: Math.random().toString(),
					}))
			}

			if (inGame) {
				const result = await netMessageToServer('getOnlinePlayers', undefined)
				if (!result.success) {
					throw new Error(result.error)
				}
				return result.data
			}

			return []
		},
		refetchInterval: inGame ? 5000 : false,
		staleTime: inGame ? 1000 : Number.POSITIVE_INFINITY,
	})
}
