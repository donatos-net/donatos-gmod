import { useQuery } from '@tanstack/react-query';
import { isMockEnvironment } from '@/lib/gmod-bridge';
import { mockServerConfig } from '@/lib/mock-data';
import type { ServerConfig } from '@/types/donatos';

export function useServerConfig() {
	const useMock = isMockEnvironment();

	return useQuery({
		queryKey: ['server-config'],
		enabled: useMock,
		queryFn: async (): Promise<ServerConfig> => {
			// Simulate network delay
			await new Promise((resolve) => setTimeout(resolve, 100));
			return mockServerConfig;
		},
		staleTime: Number.POSITIVE_INFINITY, // Server config rarely changes
	});
}
