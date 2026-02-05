import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '@/components/donatos/empty-state'
import { InventoryItemCard } from '@/components/donatos/inventory-item-card'
import { usePlayerData } from '@/hooks/use-player-data'

export const Route = createFileRoute('/donatos/inventory')({
  component: InventoryTab,
})

function InventoryTab() {
  const { data: playerData } = usePlayerData()

  if (!playerData) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    )
  }

  if (playerData.inventoryItems.length === 0) {
    return <EmptyState message="Inventory is empty" />
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="grid grid-cols-2 gap-2 p-2">
        {playerData.inventoryItems.map((item) => (
          <InventoryItemCard item={item} key={item.id} />
        ))}
      </div>
    </div>
  )
}
