import { MoreVerticalIcon } from '@hugeicons/core-free-icons'
import { useDonatosDialog } from '@/components/donatos/dynamic-dialog'
import { useDonatosError } from '@/components/donatos/error-dialog'
import { ShopActivateOfferDialog } from '@/components/donatos/shop-activate-offer-dialog'
import { ShopDepositDialog } from '@/components/donatos/shop-deposit-dialog'
import { ShopPurchaseConfirmDialog } from '@/components/donatos/shop-purchase-confirm-dialog'
import { Icon } from '@/components/icon'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useActivateItem, usePurchaseItem } from '@/hooks/use-donatos-mutations'
import { usePlayerData } from '@/hooks/use-player-data'
import { useServerConfig } from '@/hooks/use-server-config'
import { formatDuration } from '@/lib/format-duration'
import { formatPrice } from '@/lib/format-price'
import { openExternalUrl } from '@/lib/gmod-bridge'
import type { Good } from '@/types/donatos'

interface ShopItemCardProps {
	item: Good
}

const PURCHASE_ERROR_MESSAGE =
	'Не удалось выполнить покупку. Попробуйте еще раз.'

function formatDurationSuffix(duration?: number) {
	if (duration === undefined) return ''
	if (duration === 0) return ' навсегда'
	return ` на ${formatDuration(duration)}`
}

export function ShopItemCard({ item }: ShopItemCardProps) {
	const { mutateAsync: purchaseItem } = usePurchaseItem()
	const { mutateAsync: activateItem } = useActivateItem()
	const { showError } = useDonatosError()
	const { openDialog, closeDialog } = useDonatosDialog()
	const { data: playerData } = usePlayerData()
	const { data: serverConfig } = useServerConfig()

	const firstVariant = item.variants?.[0]
	const hasMultipleVariants = item.variants && item.variants.length > 1

	const showDepositDialog = (requiredAmount: number, price: number) => {
		openDialog(
			<ShopDepositDialog
				disabled={!playerData || !serverConfig}
				itemName={item.name}
				offer={{ requiredAmount, price }}
				onClose={closeDialog}
				onConfirm={() => {
					if (!playerData || !serverConfig) return
					const payUrl = serverConfig.payUrl.replace(
						'{id}',
						playerData.player.externalId,
					)
					openExternalUrl(`${payUrl}&openDeposit=${requiredAmount}`)
					closeDialog()
				}}
			/>,
		)
	}

	const showActivateDialog = (itemId: number, goodsName?: string) => {
		openDialog(
			<ShopActivateOfferDialog
				disabled={!Number.isFinite(itemId)}
				goodsName={goodsName}
				itemName={item.name}
				onClose={closeDialog}
				onConfirm={async () => {
					try {
						await activateItem(itemId)
						closeDialog()
					} catch (error) {
						showError(
							error instanceof Error && error.message
								? error
								: PURCHASE_ERROR_MESSAGE,
						)
						closeDialog()
					}
				}}
			/>,
		)
	}

	const requestPurchase = (variantId: string) => {
		const variant = item.variants?.find((entry) => entry.id === variantId)
		if (!variant) return

		openDialog(
			<ShopPurchaseConfirmDialog
				itemName={item.name}
				onClose={closeDialog}
				onConfirm={async () => {
					const balance = playerData?.player.balance
					if (typeof balance === 'number' && balance < variant.price) {
						closeDialog()
						showDepositDialog(
							Math.max(variant.price - balance, 0),
							variant.price,
						)
						return
					}

					try {
						const result = await purchaseItem({
							goodsId: item.id,
							variantId,
						})
						closeDialog()
						showActivateDialog(result.item.id, result.goods.name)
					} catch (error) {
						closeDialog()
						showError(
							error instanceof Error && error.message
								? error
								: PURCHASE_ERROR_MESSAGE,
						)
					}
				}}
				selectedVariant={{
					price: variant.price,
					duration: variant.duration,
				}}
			/>,
		)
	}

	return (
		<Card className="data-[size=sm]:gap-1" size="sm">
			<CardHeader>
				<CardTitle>{item.name}</CardTitle>
				<CardAction>
					{hasMultipleVariants ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button size="xs" variant="outline">
									Купить
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{item.variants?.map((variant) => (
									<DropdownMenuItem
										key={variant.id}
										onClick={() => requestPurchase(variant.id)}
									>
										{formatDuration(variant.duration)} -{' '}
										{formatPrice(variant.price)}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						firstVariant && (
							<Button
								onClick={() => requestPurchase(firstVariant.id)}
								size="xs"
								variant="outline"
							>
								Купить
							</Button>
						)
					)}
					{!hasMultipleVariants && !firstVariant && (
						<span aria-hidden className="text-muted-foreground">
							<Icon icon={MoreVerticalIcon} />
						</span>
					)}
				</CardAction>
			</CardHeader>
			<CardContent className="flex h-full flex-col">
				{item.description && (
					<div className="mb-2 whitespace-pre-wrap text-muted-foreground text-xs/relaxed">
						{item.description}
					</div>
				)}

				<p className="mt-auto text-card-foreground/70 text-xs">
					{hasMultipleVariants ? 'от ' : ''}
					{firstVariant && formatPrice(firstVariant.price)}
					{firstVariant && formatDurationSuffix(firstVariant.duration)}
				</p>
			</CardContent>
		</Card>
	)
}
