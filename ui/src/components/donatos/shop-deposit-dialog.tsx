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
import { formatPrice } from '@/lib/format-price'

type DepositOffer = {
	requiredAmount: number
	price: number
}

interface ShopDepositDialogProps {
	itemName: string
	offer: DepositOffer | null
	disabled: boolean
	onClose: () => void
	onConfirm: () => void
}

export function ShopDepositDialog({
	itemName,
	offer,
	disabled,
	onClose,
	onConfirm,
}: ShopDepositDialogProps) {
	return (
		<Dialog
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			open
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Недостаточно средств</DialogTitle>
					<DialogDescription>
						Для покупки {itemName} нужно {formatPrice(offer?.price ?? 0)}. Вам
						не хватает {formatPrice(offer?.requiredAmount ?? 0)}. Пополнить
						баланс?
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button size="sm" variant="outline">
							Отмена
						</Button>
					</DialogClose>
					<Button disabled={disabled || !offer} onClick={onConfirm} size="sm">
						Пополнить
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
