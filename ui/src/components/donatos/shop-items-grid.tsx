import type { Good, GoodCategory } from '@/types/donatos'
import { ShopItemCard } from './shop-item-card'

interface ShopItemsGridProps {
	categories: GoodCategory[]
	items: Good[]
	selectedCategory?: number
}

type CategoryGroup = {
	goods: Good[]
	id: number
	name: string
}

export function ShopItemsGrid({
	categories,
	items,
	selectedCategory,
}: ShopItemsGridProps) {
	const groups: CategoryGroup[] = categories.map((category) => ({
		goods: [],
		id: category.id,
		name: category.name,
	}))

	const miscCategoryId = -1
	groups.push({ goods: [], id: miscCategoryId, name: 'Разное' })

	for (const item of items) {
		const categoryId = item.categoryId ?? miscCategoryId
		const group = groups.find((category) => category.id === categoryId)
		if (group) {
			group.goods.push(item)
		}
	}

	const visibleGroups = groups.filter((group) =>
		selectedCategory !== undefined ? group.id === selectedCategory : true,
	)

	return (
		<div className="flex flex-col gap-4 p-2">
			{visibleGroups.map((group) => {
				if (group.goods.length === 0) {
					return null
				}

				return (
					<div className="flex flex-col gap-2" key={group.id}>
						<p className="text-foreground text-sm">{group.name}</p>
						<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2">
							{group.goods.map((item) => (
								<ShopItemCard item={item} key={item.id} />
							))}
						</div>
					</div>
				)
			})}
		</div>
	)
}
