import { createFileRoute, Outlet } from '@tanstack/react-router'
import { DonatosHeader } from '@/components/donatos/donatos-header'
import { DonatosDialogProvider } from '@/components/donatos/dynamic-dialog'
import { DonatosErrorProvider } from '@/components/donatos/error-dialog'

export const Route = createFileRoute('/donatos')({
	component: DonatosLayout,
})

function DonatosLayout() {
	return (
		<DonatosErrorProvider>
			<DonatosDialogProvider>
				<div className="flex h-full flex-col overflow-hidden rounded-lg bg-background/[98%]">
					<DonatosHeader />
					<div className="flex-1 overflow-hidden">
						<Outlet />
					</div>
				</div>
			</DonatosDialogProvider>
		</DonatosErrorProvider>
	)
}
