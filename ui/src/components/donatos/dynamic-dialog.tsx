import {
	createContext,
	type ReactElement,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

type DynamicDialogContextValue = {
	openDialog: (dialog: ReactElement) => void
	closeDialog: () => void
}

const DynamicDialogContext = createContext<DynamicDialogContextValue | null>(
	null,
)

export function DonatosDialogProvider({ children }: { children: ReactNode }) {
	const [dialog, setDialog] = useState<ReactElement | null>(null)
	const openDialog = useCallback((nextDialog: ReactElement) => {
		setDialog(nextDialog)
	}, [])
	const closeDialog = useCallback(() => {
		setDialog(null)
	}, [])

	return (
		<DynamicDialogContext.Provider value={{ openDialog, closeDialog }}>
			{children}
			<Dialog
				onOpenChange={(open) => {
					if (!open) closeDialog()
				}}
				open={dialog !== null}
			>
				<DialogContent>{dialog}</DialogContent>
			</Dialog>
		</DynamicDialogContext.Provider>
	)
}

export function useDonatosDialog() {
	const context = useContext(DynamicDialogContext)
	if (!context) {
		throw new Error(
			'useDonatosDialog must be used within DonatosDialogProvider',
		)
	}
	return context
}
