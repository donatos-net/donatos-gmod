import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
		<div className="flex items-center gap-2 border-border/30 border-b bg-muted/40 p-2 shadow-sm">
			<Button
				className={cn(selected && 'text-foreground/70')}
				onClick={() => onSelect(undefined)}
				size="sm"
				variant={selected === undefined ? 'secondary' : 'ghost'}
			>
				Все
			</Button>
			{categories.map((category) => (
				<Button
					className={cn(selected !== category.id && 'text-foreground/70')}
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
