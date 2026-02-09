import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { CategoryFilter } from '@/components/donatos/category-filter'
import { EmptyState } from '@/components/donatos/empty-state'
import { ShopItemsGrid } from '@/components/donatos/shop-items-grid'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useServerConfig } from '@/hooks/use-server-config'

export const Route = createFileRoute('/donatos/shop')({
	component: ShopTab,
})

function ShopTab() {
	const { data: config } = useServerConfig()
	const [selectedCategory, setSelectedCategory] = useState<number | undefined>()

	const { items, visibleItemCount, totalItems } = useMemo(() => {
		if (!config) {
			return { items: [], totalItems: 0, visibleItemCount: 0 }
		}

		const items = config.goods
		const totalItems = items.length
		const visibleItemCount =
			selectedCategory === undefined
				? totalItems
				: items.filter((item) => item.categoryId === selectedCategory).length

		return {
			totalItems,
			items,
			visibleItemCount,
		}
	}, [config, selectedCategory])

	if (!config) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-muted-foreground text-sm">Загрузка...</p>
			</div>
		)
	}

	return (
		<div className="flex h-full flex-col">
			<CategoryFilter
				categories={config.goodsCategories}
				onSelect={setSelectedCategory}
				selected={selectedCategory}
			/>
			<ScrollArea className="min-h-0 w-full flex-1">
				{totalItems === 0 || visibleItemCount === 0 ? (
					<EmptyState message="Нет доступных предметов" />
				) : (
					<ShopItemsGrid
						categories={config.goodsCategories}
						items={items}
						selectedCategory={selectedCategory}
					/>
				)}
			</ScrollArea>
		</div>
	)
}
