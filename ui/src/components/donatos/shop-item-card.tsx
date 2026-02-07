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
				onConfirm={() => {
					if (!playerData || !serverConfig) return
					const payUrl = serverConfig.payUrl.replace(
						'{id}',
						playerData.player.externalId,
					)
					openExternalUrl(`${payUrl}&openDeposit=${requiredAmount}`)
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
				selectedVariant={variant}
			/>,
		)
	}

	return (
		<Card className="ring-0" size="sm">
			<CardHeader>
				<CardTitle>{item.name}</CardTitle>
				<CardAction>
					{hasMultipleVariants ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button size="sm">Купить</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{item.variants?.map((variant) => {
									const durationText = formatDuration(variant.duration)
									return (
										<DropdownMenuItem
											key={variant.id}
											onClick={() => requestPurchase(variant.id)}
										>
											{durationText ? `${durationText} - ` : ''}
											{formatPrice(variant.price)}
										</DropdownMenuItem>
									)
								})}
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						firstVariant && (
							<Button
								onClick={() => requestPurchase(firstVariant.id)}
								size="sm"
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
					<div className="mb-4 whitespace-pre-wrap text-muted-foreground text-xs/relaxed">
						{item.description}
					</div>
				)}

				<div className="mt-auto flex flex-col gap-0.5">
					<p className="font-semibold text-foreground/90 text-sm [font-variant-numeric:tabular-nums]">
						{firstVariant
							? `${hasMultipleVariants ? 'от ' : ''}${formatPrice(firstVariant.price)}`
							: '—'}
					</p>
					{!hasMultipleVariants && firstVariant && !!firstVariant.duration && (
						<p className="text-muted-foreground text-xs">
							Срок: {formatDuration(firstVariant.duration)}
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
