import { useQuery } from '@tanstack/react-query'
import { isMockEnvironment } from '@/lib/gmod-bridge'
import { mockPlayerData } from '@/lib/mock-data'

export function usePlayerExternalId() {
	const useMock = isMockEnvironment()

	return useQuery({
		queryKey: ['player-external-id'],
		enabled: useMock,
		queryFn: async (): Promise<string> => {
			// Simulate network delay
			await new Promise((resolve) => setTimeout(resolve, 100))
			return mockPlayerData.player.externalId
		},
		staleTime: Number.POSITIVE_INFINITY,
	})
}
