import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { netMessageToServer, openExternalUrl } from '@/lib/gmod-bridge'

const QUICK_AMOUNTS = [100, 300, 500, 1000]

interface IgsDepositDialogProps {
	initialSum: number
	onBack: () => void
}

export function IgsDepositDialog({
	initialSum,
	onBack,
}: IgsDepositDialogProps) {
	const [sum, setSum] = useState<number>(initialSum)
	const [submitError, setSubmitError] = useState<string | null>(null)

	const createIgsPaymentUrlMutation = useMutation({
		mutationFn: async (topupSum: number) => {
			const result = await netMessageToServer('createIgsPaymentUrl', {
				sum: topupSum,
			})
			if (!result.success) {
				throw new Error(result.error)
			}
			return result.data
		},
		onSuccess: (data) => {
			openExternalUrl(data.url)
		},
		onError: (error) => {
			setSubmitError(
				error instanceof Error && error.message
					? error.message
					: 'Не удалось создать ссылку на оплату',
			)
		},
	})

	const handleContinue = () => {
		if (!Number.isFinite(sum) || sum <= 0) {
			setSubmitError('Укажите корректную сумму пополнения')
			return
		}
		setSubmitError(null)
		createIgsPaymentUrlMutation.mutate(sum)
	}

	return (
		<>
			<DialogHeader>
				<DialogTitle>Пополнить через gm-donate</DialogTitle>
				<DialogDescription>
					Это сторонний сервис, который подключен администратором сервера и не
					имеет отношения к Donatos. Доступны скины, криптовалюта и другие
					методы. Поддержка по этому сервису не предоставляется.
				</DialogDescription>
			</DialogHeader>
			<div className="space-y-3">
				<div className="grid grid-cols-4 gap-2">
					{QUICK_AMOUNTS.map((quickSum) => (
						<Button
							className="h-8"
							key={quickSum}
							onClick={() => setSum(quickSum)}
							size="sm"
							variant={sum === quickSum ? 'default' : 'outline'}
						>
							{quickSum}
						</Button>
					))}
				</div>
				<Input
					inputMode="numeric"
					min={1}
					onChange={(e) => {
						setSubmitError(null)
						setSum(Number(e.target.value))
					}}
					placeholder="Сумма пополнения"
					type="number"
					value={Number.isFinite(sum) ? sum : ''}
				/>
				<FieldError>{submitError}</FieldError>
			</div>
			<DialogFooter>
				<Button
					disabled={createIgsPaymentUrlMutation.isPending}
					onClick={onBack}
					size="sm"
					variant="outline"
				>
					Назад
				</Button>
				<Button
					disabled={createIgsPaymentUrlMutation.isPending}
					onClick={handleContinue}
					size="sm"
				>
					{createIgsPaymentUrlMutation.isPending && (
						<Spinner data-icon="inline-start" />
					)}
					Продолжить
				</Button>
			</DialogFooter>
		</>
	)
}
