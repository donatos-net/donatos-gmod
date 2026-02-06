import { Button } from '@/components/ui/button'
import type { GoodCategory } from '@/types/donatos'

interface CategoryFilterProps {
	categories: GoodCategory[]
	selected: number | undefined
	onSelect: (categoryId: number | undefined) => void
}

export function CategoryFilter({
	categories,
	selected,
	onSelect,
}: CategoryFilterProps) {
	return (
		<div className="flex items-center gap-2 border-border/30 border-b bg-background/90 p-2 shadow-sm">
			<Button
				onClick={() => onSelect(undefined)}
				size="sm"
				variant={selected === undefined ? 'secondary' : 'ghost'}
			>
				Все
			</Button>
			{categories.map((category) => (
				<Button
					key={category.id}
					onClick={() => onSelect(category.id)}
					size="sm"
					variant={selected === category.id ? 'secondary' : 'ghost'}
				>
					{category.name}
				</Button>
			))}
		</div>
	)
}
