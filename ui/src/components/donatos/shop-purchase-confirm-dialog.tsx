import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { formatDurationInParens } from '@/lib/format-duration'
import { formatPrice } from '@/lib/format-price'
import type { GoodVariant } from '@/types/donatos'

interface ShopPurchaseConfirmDialogProps {
	itemName: string
	selectedVariant: GoodVariant | null
	onConfirm: () => Promise<void> | void
}

export function ShopPurchaseConfirmDialog({
	itemName,
	selectedVariant,
	onConfirm,
}: ShopPurchaseConfirmDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)

	return (
		<>
			<DialogHeader>
				<DialogTitle>Подтвердить покупку</DialogTitle>
				<DialogDescription>
					Вы уверены, что хотите купить {itemName}
					{selectedVariant && (
						<>
							{' '}
							за {formatPrice(selectedVariant.price)}
							{formatDurationInParens(selectedVariant.duration)}
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
					disabled={!selectedVariant || isSubmitting}
					onClick={async () => {
						setIsSubmitting(true)
						try {
							await onConfirm()
						} finally {
							setIsSubmitting(false)
						}
					}}
					size="sm"
				>
					{isSubmitting && <Spinner data-icon="inline-start" />}
					Купить
				</Button>
			</DialogFooter>
		</>
	)
}
