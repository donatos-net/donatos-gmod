import { useQuery } from '@tanstack/react-query'
import { isInGame, isMockEnvironment, netMessageToServer } from '@/lib/gmod-bridge'
import type { OnlinePlayer } from '@/types/donatos'

const mockOnlinePlayers: OnlinePlayer[] = [
	{
		externalId: '76561198000000001',
		name: 'PlayerOne',
		avatarUrl: 'https://avatars.cloudflare.steamstatic.com/ee95bc3930f56f71353b4cb03c877cf5c7f6e02a_full.jpg',
	},
	{
		externalId: '76561198000000002',
		name: 'PlayerTwo',
		avatarUrl: 'https://avatars.cloudflare.steamstatic.com/89f7f9e6f2dc14283b77f6e8ec6a23f8a031aa96_full.jpg',
	},
]

export function useOnlinePlayers() {
	const inGame = isInGame()
	const useMock = isMockEnvironment()

	return useQuery({
		queryKey: ['online-players'],
		enabled: inGame || useMock,
		queryFn: async (): Promise<OnlinePlayer[]> => {
			if (inGame) {
				const result = await netMessageToServer('getOnlinePlayers', undefined)
				if (!result.success) {
					throw new Error(result.error)
				}
				return result.data
			}

			await new Promise((resolve) => setTimeout(resolve, 150))
			return mockOnlinePlayers
		},
		refetchInterval: inGame ? 5000 : false,
		staleTime: inGame ? 1000 : Number.POSITIVE_INFINITY,
	})
}
