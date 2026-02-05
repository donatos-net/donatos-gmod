import { createFileRoute, Outlet } from '@tanstack/react-router';
import { DonatosHeader } from '@/components/donatos/donatos-header';
import { ScrollArea } from '@/components/ui/scroll-area';

export const Route = createFileRoute('/donatos')({
	component: DonatosLayout,
});

function DonatosLayout() {
	return (
		<div className="flex h-full flex-col overflow-hidden rounded-lg bg-muted/90">
			<DonatosHeader />
			<div className="flex-1 overflow-hidden">
				<ScrollArea className="h-full w-full">
					<Outlet />
				</ScrollArea>
			</div>
		</div>
	);
}
