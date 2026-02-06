import { createFileRoute, Outlet } from '@tanstack/react-router'
import { DonatosHeader } from '@/components/donatos/donatos-header'
import { DonatosErrorProvider } from '@/components/donatos/error-dialog'

export const Route = createFileRoute('/donatos')({
	component: DonatosLayout,
})

function DonatosLayout() {
	return (
		<DonatosErrorProvider>
			<div className="flex h-full flex-col overflow-hidden rounded-lg bg-muted/95">
				<DonatosHeader />
				<div className="flex-1 overflow-hidden">
					<Outlet />
				</div>
			</div>
		</DonatosErrorProvider>
	)
}
