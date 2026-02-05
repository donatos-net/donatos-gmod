import { MoreVerticalIcon } from '@hugeicons/core-free-icons';
import { useState } from 'react';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
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
import { usePurchaseItem } from '@/hooks/use-donatos-mutations';
import { formatDuration } from '@/lib/format-duration';
import { formatPrice } from '@/lib/format-price';
import type { Good } from '@/types/donatos';

interface ShopItemCardProps {
	item: Good;
}

export function ShopItemCard({ item }: ShopItemCardProps) {
	const { mutate: purchaseItem } = usePurchaseItem();
	const [isHovered, setIsHovered] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [pendingVariantId, setPendingVariantId] = useState<string | null>(null);
	const firstVariant = item.variants?.[0];
	const hasMultipleVariants = item.variants && item.variants.length > 1;
	const selectedVariant = item.variants?.find(
		(variant) => variant.id === pendingVariantId,
	);

	const handlePurchase = (variantId: string) => {
		purchaseItem({ goodsId: item.id, variantId });
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

	return (
		<Card
			className="bg-card"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			size="sm"
		>
			<CardHeader>
				<CardTitle>{item.name}</CardTitle>
				<CardAction>
					{hasMultipleVariants ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button size="xs" variant="secondary">
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
								variant={isHovered ? 'default' : 'secondary'}
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
				{item.description && (
					<CardDescription className="whitespace-pre-wrap">
						{item.description}
					</CardDescription>
				)}
			</CardHeader>
			<CardContent>
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
							onClick={() => {
								if (pendingVariantId) {
									handlePurchase(pendingVariantId);
								}
							}}
							size="sm"
						>
							Купить
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
