import { MoreVerticalIcon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { useDonatosError } from '@/components/donatos/error-dialog';
import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import {
	useActivateItem,
	usePurchaseItem,
} from '@/hooks/use-donatos-mutations';
import { formatDuration } from '@/lib/format-duration';
import { formatPrice } from '@/lib/format-price';
import type { Good } from '@/types/donatos';

interface ShopItemCardProps {
	item: Good;
}

export function ShopItemCard({ item }: ShopItemCardProps) {
	const { mutate: purchaseItem, isPending: isPurchasing } = usePurchaseItem();
	const { mutate: activateItem, isPending: isActivating } = useActivateItem();
	const { showError } = useDonatosError();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [pendingVariantId, setPendingVariantId] = useState<string | null>(null);
	const [activateOffer, setActivateOffer] = useState<{
		itemId: number;
		goodsName?: string;
	} | null>(null);
	const firstVariant = item.variants?.[0];
	const hasMultipleVariants = item.variants && item.variants.length > 1;
	const selectedVariant = item.variants?.find(
		(variant) => variant.id === pendingVariantId,
	);

	const handlePurchase = (variantId: string) => {
		purchaseItem(
			{ goodsId: item.id, variantId },
			{
				onSuccess: (result) => {
					setConfirmOpen(false);
					setPendingVariantId(null);
					setActivateOffer({
						itemId: result.item.id,
						goodsName: result.goods.name,
					});
				},
				onError: (error) => {
					setConfirmOpen(false);
					setPendingVariantId(null);
					showError(getErrorMessage(error));
				},
			},
		);
	};

	const requestPurchase = (variantId: string) => {
		setPendingVariantId(variantId);
		setConfirmOpen(true);
	};

	const renderDuration = (duration?: number) => {
		if (duration === undefined) return '';
		if (duration === 0) return ' навсегда';
		return ` на ${formatDuration(duration)}`;
	};

	const getErrorMessage = (error: unknown) => {
		if (error instanceof Error && error.message) return error.message;
		return 'Не удалось выполнить покупку. Попробуйте еще раз.';
	};

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
			<CardContent>
				{item.description && (
					<div className="mb-2 whitespace-pre-wrap text-muted-foreground text-xs/relaxed">
						{item.description}
					</div>
				)}

				<p className="text-card-foreground/70 text-xs">
					{hasMultipleVariants ? 'от ' : ''}
					{firstVariant && formatPrice(firstVariant.price)}
					{firstVariant && renderDuration(firstVariant.duration)}
				</p>
			</CardContent>
			<Dialog
				onOpenChange={(open) => {
					setConfirmOpen(open);
					if (!open) {
						setPendingVariantId(null);
					}
				}}
				open={confirmOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Подтвердить покупку</DialogTitle>
						<DialogDescription>
							Вы уверены, что хотите купить {item.name}
							{selectedVariant && (
								<>
									{' '}
									за {formatPrice(selectedVariant.price)}
									{renderDuration(selectedVariant.duration)}
								</>
							)}
							?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button size="sm" variant="outline">
								Отмена
							</Button>
						</DialogClose>
						<Button
							disabled={!pendingVariantId || isPurchasing}
							onClick={() => {
								if (pendingVariantId) {
									handlePurchase(pendingVariantId);
								}
							}}
							size="sm"
						>
							{isPurchasing && <Spinner data-icon="inline-start" />}
							Купить
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog
				onOpenChange={(open) => {
					if (!open) {
						setActivateOffer(null);
					}
				}}
				open={activateOffer !== null}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Активировать предмет?</DialogTitle>
						<DialogDescription>
							Хотите активировать {activateOffer?.goodsName ?? item.name}{' '}
							сейчас?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button size="sm" variant="outline">
								Позже
							</Button>
						</DialogClose>
						<Button
							disabled={activateOffer === null || isActivating}
							onClick={() => {
								if (!activateOffer) return;
								activateItem(activateOffer.itemId, {
									onSuccess: () => setActivateOffer(null),
									onError: (error) => {
										showError(getErrorMessage(error));
										setActivateOffer(null);
									},
								});
							}}
							size="sm"
						>
							{isActivating && <Spinner data-icon="inline-start" />}
							Активировать
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
