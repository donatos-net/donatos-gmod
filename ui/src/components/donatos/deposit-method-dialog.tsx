import { useDonatosDialog } from '@/components/donatos/dynamic-dialog'
import { Button } from '@/components/ui/button'
import {
	DialogClose,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { openExternalUrl } from '@/lib/gmod-bridge'
import { CardsIcon } from './icons'
import { IgsDepositDialog } from './igs-deposit-dialog'

interface DepositMethodDialogProps {
	playerExternalId: string
	payUrl: string
	igsEnabled: boolean
	depositAmount?: number
}

export function DepositMethodDialog({
	playerExternalId,
	payUrl,
	igsEnabled,
	depositAmount,
}: DepositMethodDialogProps) {
	const { openDialog, closeDialog } = useDonatosDialog()

	const openCardsDeposit = () => {
		const playerPayUrl = payUrl.replace('{id}', playerExternalId)
		const openDepositValue =
			typeof depositAmount === 'number' && Number.isFinite(depositAmount)
				? depositAmount
				: true
		openExternalUrl(`${playerPayUrl}&openDeposit=${openDepositValue}`)
	}

	const openIgsDeposit = () => {
		openDialog(
			<IgsDepositDialog
				initialSum={
					typeof depositAmount === 'number' && Number.isFinite(depositAmount)
						? depositAmount
						: 100
				}
				onBack={() =>
					openDialog(
						<DepositMethodDialog
							depositAmount={depositAmount}
							igsEnabled={igsEnabled}
							payUrl={payUrl}
							playerExternalId={playerExternalId}
						/>,
					)
				}
			/>,
		)
	}

	return (
		<>
			<DialogHeader>
				<DialogTitle>Выберите способ пополнения</DialogTitle>
			</DialogHeader>
			<div className="grid grid-cols-1 gap-3">
				<button
					className="flex gap-3 rounded-md border border-primary/50 bg-primary/20 p-4 text-left transition-colors hover:bg-primary/30"
					onClick={() => {
						closeDialog()
						openCardsDeposit()
					}}
					type="button"
				>
					<CardsIcon />
					<div>
						<div className="flex items-center gap-2">
							<span className="font-medium text-sm">Карты РФ, СБП, Сбер</span>
						</div>
						<div className="text-muted-foreground text-xs">
							Быстрое пополнение банковскими способами
						</div>
					</div>
				</button>
				<button
					className="flex gap-3 rounded-md border border-border bg-card p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
					disabled={!igsEnabled}
					onClick={() => {
						closeDialog()
						void openIgsDeposit()
					}}
					type="button"
				>
					<div>
						<div className="font-medium text-sm">Другие способы</div>
						<div className="text-muted-foreground text-xs">
							Скины, USDT и другое
						</div>
					</div>
				</button>
			</div>
			<DialogFooter>
				<DialogClose asChild>
					<Button size="sm" variant="outline">
						Отмена
					</Button>
				</DialogClose>
			</DialogFooter>
		</>
	)
}
