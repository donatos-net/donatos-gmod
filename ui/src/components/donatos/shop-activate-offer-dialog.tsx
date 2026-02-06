import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'

interface ShopActivateOfferDialogProps {
	itemName: string
	goodsName?: string
	disabled: boolean
	onClose: () => void
	onConfirm: () => Promise<void> | void
}

export function ShopActivateOfferDialog({
	itemName,
	goodsName,
	disabled,
	onClose,
	onConfirm,
}: ShopActivateOfferDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)

	return (
		<Dialog
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			open
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Активировать предмет?</DialogTitle>
					<DialogDescription>
						Хотите активировать {goodsName ?? itemName} сейчас?
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button size="sm" variant="outline">
							Позже
						</Button>
					</DialogClose>
					<Button
						disabled={disabled || isSubmitting}
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
						Активировать
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
