import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '@/components/donatos/empty-state'
import { InventoryItemCard } from '@/components/donatos/inventory-item-card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePlayerData } from '@/hooks/use-player-data'

export const Route = createFileRoute('/donatos/inventory')({
	component: InventoryTab,
})

function InventoryTab() {
	const { data: playerData } = usePlayerData()

	if (!playerData) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-muted-foreground text-sm">Загрузка...</p>
			</div>
		)
	}

	if (playerData.inventoryItems.length === 0) {
		return <EmptyState message="Инвентарь пуст" />
	}

	return (
		<ScrollArea className="h-full w-full flex-1">
			<div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3 p-4">
				{playerData.inventoryItems.map((item) => (
					<InventoryItemCard item={item} key={item.id} />
				))}
			</div>
		</ScrollArea>
	)
}
