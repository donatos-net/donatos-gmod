import { createContext, useCallback, useContext, useState } from 'react'

type DynamicDialogContextValue = {
	openDialog: (dialog: React.ReactElement) => void
	closeDialog: () => void
}

const DynamicDialogContext = createContext<DynamicDialogContextValue | null>(
	null,
)

export function DonatosDialogProvider({
	children,
}: {
	children: React.ReactNode
}) {
	const [dialog, setDialog] = useState<React.ReactElement | null>(null)

	const openDialog = useCallback((nextDialog: React.ReactElement) => {
		setDialog(nextDialog)
	}, [])

	const closeDialog = useCallback(() => {
		setDialog(null)
	}, [])

	return (
		<DynamicDialogContext.Provider value={{ openDialog, closeDialog }}>
			{children}
			{dialog}
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
