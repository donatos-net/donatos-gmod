import { createContext, useCallback, useContext, useState } from 'react'
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

type ErrorState = {
	title: string
	message: string
}

type ErrorDialogContextValue = {
	showError: (message: string, title?: string) => void
}

const ErrorDialogContext = createContext<ErrorDialogContextValue | null>(null)

export function DonatosErrorProvider({
	children,
}: {
	children: React.ReactNode
}) {
	const [error, setError] = useState<ErrorState | null>(null)

	const showError = useCallback((message: string, title = 'Ошибка') => {
		setError({ title, message })
	}, [])

	return (
		<ErrorDialogContext.Provider value={{ showError }}>
			{children}
			<Dialog
				onOpenChange={(open) => {
					if (!open) setError(null)
				}}
				open={Boolean(error)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{error?.title ?? 'Ошибка'}</DialogTitle>
						<DialogDescription>{error?.message ?? ''}</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button size="sm">Закрыть</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</ErrorDialogContext.Provider>
	)
}

export function useDonatosError() {
	const context = useContext(ErrorDialogContext)
	if (!context) {
		throw new Error('useDonatosError must be used within DonatosErrorProvider')
	}
	return context
}
