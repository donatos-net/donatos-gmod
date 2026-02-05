import { useQuery } from '@tanstack/react-query';
import { isMockEnvironment } from '@/lib/gmod-bridge';
import { mockPlayerData } from '@/lib/mock-data';
import type { PlayerData } from '@/types/donatos';

export function usePlayerData() {
	const useMock = isMockEnvironment();

	return useQuery({
		queryKey: ['player-data'],
		enabled: useMock,
		queryFn: async (): Promise<PlayerData> => {
			// Simulate network delay
			await new Promise((resolve) => setTimeout(resolve, 100));
			return mockPlayerData;
		},
		refetchInterval: useMock ? 5000 : false, // Refetch every 5 seconds for real-time updates
	});
}
