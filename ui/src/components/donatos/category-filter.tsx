import { Button } from '@/components/ui/button';
import type { GoodCategory } from '@/types/donatos';

interface CategoryFilterProps {
	categories: GoodCategory[];
	selected: number | undefined;
	onSelect: (categoryId: number | undefined) => void;
}

export function CategoryFilter({
	categories,
	selected,
	onSelect,
}: CategoryFilterProps) {
	return (
		<div className="flex items-center gap-2 border-border/10 border-b bg-background/50 p-2">
			<Button
				onClick={() => onSelect(undefined)}
				size="sm"
				variant={selected === undefined ? 'default' : 'ghost'}
			>
				Все
			</Button>
			{categories.map((category) => (
				<Button
					key={category.id}
					onClick={() => onSelect(category.id)}
					size="sm"
					variant={selected === category.id ? 'default' : 'ghost'}
				>
					{category.name}
				</Button>
			))}
		</div>
	);
}
