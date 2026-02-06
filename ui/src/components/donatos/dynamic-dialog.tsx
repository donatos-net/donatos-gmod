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
	const [open, setOpen] = useState(false)

	const openDialog = useCallback((nextDialog: ReactElement) => {
		setDialog(nextDialog)
		setOpen(true)
	}, [])

	const closeDialog = useCallback(() => {
		setOpen(false)
	}, [])

	return (
		<DynamicDialogContext.Provider value={{ openDialog, closeDialog }}>
			{children}
			<Dialog
				onOpenChange={(open) => {
					if (!open) closeDialog()
				}}
				open={open}
			>
				<DialogContent
					onAnimationEnd={() => {
						if (!open) {
							setDialog(null)
						}
					}}
				>
					{dialog}
				</DialogContent>
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
