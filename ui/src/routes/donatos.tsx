import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { DonatosHeader } from '@/components/donatos/donatos-header'
import { DonatosDialogProvider } from '@/components/donatos/dynamic-dialog'
import { DonatosErrorProvider } from '@/components/donatos/error-dialog'
import { useServerConfig } from '@/hooks/use-server-config'
import { notifyUiReady } from '@/lib/gmod-bridge'

export const Route = createFileRoute('/donatos')({
	component: DonatosLayout,
})

function DonatosLayout() {
	const { data: serverConfig } = useServerConfig()

	useEffect(() => {
		if (!serverConfig) {
			return
		}

		requestAnimationFrame(() => {
			notifyUiReady()
		})
	}, [serverConfig])

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
