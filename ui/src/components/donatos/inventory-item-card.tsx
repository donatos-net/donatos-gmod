import { GiftIcon, MoreHorizontalIcon } from '@hugeicons/core-free-icons'
import { useDonatosError } from '@/components/donatos/error-dialog'
import { InventoryGiftDialog } from '@/components/donatos/inventory-gift-dialog'
import { Icon } from '@/components/icon'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { useActivateItem } from '@/hooks/use-donatos-mutations'
import { formatDurationInParens } from '@/lib/format-duration'
import type { InventoryItem } from '@/types/donatos'
import { useDonatosDialog } from './dynamic-dialog'

interface InventoryItemCardProps {
	item: InventoryItem
}

export function InventoryItemCard({ item }: InventoryItemCardProps) {
	const { mutate: activateItem, isPending: isActivating } = useActivateItem()
	const { openDialog } = useDonatosDialog()
	const { showError } = useDonatosError()

	const durationText = formatDurationInParens(item.variant?.duration)

	const openGiftDialog = () => {
		openDialog(<InventoryGiftDialog item={item} />)
	}

	return (
		<Card className="ring-0" size="sm">
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
					<ButtonGroup>
						<Button
							disabled={isActivating}
							onClick={() =>
								activateItem(item.id, {
									onError: (error) => showError(error),
								})
							}
							size="xs"
						>
							{isActivating && <Spinner data-icon="inline-start" />}
							Активировать
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button aria-label="More Options" size="xs">
									<Icon icon={MoreHorizontalIcon} />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-40">
								<DropdownMenuGroup>
									<DropdownMenuItem onClick={openGiftDialog}>
										<Icon icon={GiftIcon} />
										Подарить
									</DropdownMenuItem>
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</ButtonGroup>
					{/* <Button
							onClick={() =>
								dropItem(item.id, {
									onError: (error) => showError(error),
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
