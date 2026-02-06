import { useDonatosError } from '@/components/donatos/error-dialog'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { useActivateItem } from '@/hooks/use-donatos-mutations'
import { formatDurationInParens } from '@/lib/format-duration'
import type { InventoryItem } from '@/types/donatos'

interface InventoryItemCardProps {
	item: InventoryItem
}

export function InventoryItemCard({ item }: InventoryItemCardProps) {
	const { mutate: activateItem } = useActivateItem()
	// const { mutate: dropItem } = useDropItem();
	const { showError } = useDonatosError()

	const durationText = formatDurationInParens(item.variant?.duration)

	return (
		<Card className="bg-card" size="sm">
			<CardHeader>
				<CardTitle>
					{item.goods?.name ?? 'Deleted Item'}
					{durationText}
				</CardTitle>
				{item.goods?.description && (
					<CardDescription className="whitespace-pre-wrap">
						{item.goods.description}
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="flex items-center gap-2">
				<p className="text-muted-foreground text-xs">
					Куплено за {item.amountPaid ?? '0'} бонусов
				</p>
				<div className="ml-auto flex items-center gap-2">
					<Button
						onClick={() =>
							activateItem(item.id, {
								onError: (error) => showError(getErrorMessage(error)),
							})
						}
						size="xs"
					>
						Активировать
					</Button>
					{/* <Button
						onClick={() =>
							dropItem(item.id, {
								onError: (error) => showError(getErrorMessage(error)),
							})
						}
						size="xs"
						variant="destructive"
					>
						Выбросить
					</Button> */}
				</div>
			</CardContent>
		</Card>
	)
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error && error.message) return error.message
	return 'Не удалось выполнить действие. Попробуйте еще раз.'
}
