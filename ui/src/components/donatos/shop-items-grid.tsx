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
		<div className="flex flex-col gap-7 p-4">
			{visibleGroups.map((group) => {
				if (group.goods.length === 0) {
					return null
				}

				return (
					<section className="flex flex-col gap-3" key={group.id}>
						<div className="flex items-center gap-2">
							<div className="h-4 w-0.5 rounded-full bg-foreground" />
							<h3 className="font-semibold text-foreground text-sm tracking-tight">
								{group.name}
							</h3>
						</div>
						<div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3">
							{group.goods.map((item) => (
								<ShopItemCard item={item} key={item.id} />
							))}
						</div>
					</section>
				)
			})}
		</div>
	)
}
