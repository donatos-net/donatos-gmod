import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { ActiveItemCard } from '@/components/donatos/active-item-card'
import { EmptyState } from '@/components/donatos/empty-state'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePlayerData } from '@/hooks/use-player-data'

export const Route = createFileRoute('/donatos/active-items')({
	component: ActiveItemsTab,
})

function ActiveItemsTab() {
	const { data: playerData } = usePlayerData()

	const sortedItems = useMemo(() => {
		if (!playerData) return []
		return [...playerData.activeItems].sort((a, b) => {
			// Items with expiration come first, sorted by how close they are to expiring
			if (a.expires && b.expires) {
				const aProgress = a.expires.inS / a.expires.durationS
				const bProgress = b.expires.inS / b.expires.durationS
				return aProgress - bProgress
			}
			// Items without expiration come last
			if (!a.expires) return 1
			if (!b.expires) return -1
			return 0
		})
	}, [playerData])

	if (!playerData) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-muted-foreground text-sm">Загрузка...</p>
			</div>
		)
	}

	if (sortedItems.length === 0) {
		return <EmptyState message="У вас нет активных предметов" />
	}

	return (
		<ScrollArea className="h-full w-full flex-1">
			<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2 p-2">
				{sortedItems.map((item) => (
					<ActiveItemCard item={item} key={item.id} />
				))}
			</div>
		</ScrollArea>
	)
}
