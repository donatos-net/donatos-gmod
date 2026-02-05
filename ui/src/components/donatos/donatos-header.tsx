import {
	BlockchainIcon,
	Calendar02Icon,
	Cancel01Icon,
	PlusSignIcon,
	ShoppingBagIcon,
} from '@hugeicons/core-free-icons';
import { Link, useMatchRoute } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePlayerData } from '@/hooks/use-player-data';
import { useServerConfig } from '@/hooks/use-server-config';
import { closeUi, openExternalUrl } from '@/lib/gmod-bridge';
import { cn } from '@/lib/utils';
import { Icon } from '../icon';

export function DonatosHeader() {
	const { data: playerData } = usePlayerData();
	const { data: serverConfig } = useServerConfig();
	const matchRoute = useMatchRoute();

	const handleBalanceClick = () => {
		if (!playerData || !serverConfig) return;
		const payUrl = serverConfig.payUrl.replace(
			'{id}',
			playerData.player.externalId,
		);
		openExternalUrl(`${payUrl}&openDeposit=true`);
	};

	const handleClose = () => {
		closeUi();
	};

	const isShopActive = matchRoute({ to: '/donatos/shop' });
	const isInventoryActive = matchRoute({ to: '/donatos/inventory' });
	const isActiveItemsActive = matchRoute({ to: '/donatos/active-items' });

	return (
		<div className="relative flex flex-col gap-0 overflow-hidden bg-primary p-1.5 text-primary-foreground">
			<div
				aria-hidden
				className="donatos-animated-bg pointer-events-none absolute inset-0 opacity-50"
			/>
			<div className="relative z-10 flex items-center gap-2">
				<Button
					asChild
					className={cn(
						'text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground dark:hover:bg-primary-foreground/20',
						!!isShopActive &&
							'bg-primary-foreground/15 text-primary-foreground ring-1 ring-primary-foreground/30',
					)}
					size="sm"
					variant="ghost"
				>
					<Link to="/donatos/shop">
						<Icon icon={ShoppingBagIcon} />
						Магазин
					</Link>
				</Button>

				<Button
					asChild
					className={cn(
						'text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground dark:hover:bg-primary-foreground/20',
						!!isInventoryActive &&
							'bg-primary-foreground/15 text-primary-foreground ring-1 ring-primary-foreground/30',
					)}
					size="sm"
					variant="ghost"
				>
					<Link to="/donatos/inventory">
						<Icon icon={BlockchainIcon} />
						Инвентарь
						{playerData && playerData.inventoryItems.length > 0 && (
							<Badge className="ml-1 bg-secondary/20" variant="default">
								{playerData.inventoryItems.length}
							</Badge>
						)}
					</Link>
				</Button>

				<Button
					asChild
					className={cn(
						'text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground dark:hover:bg-primary-foreground/20',
						!!isActiveItemsActive &&
							'bg-primary-foreground/15 text-primary-foreground ring-1 ring-primary-foreground/30',
					)}
					size="sm"
					variant="ghost"
				>
					<Link to="/donatos/active-items">
						<Icon icon={Calendar02Icon} />
						Активные предметы
						{playerData && playerData.activeItems.length > 0 && (
							<Badge className="ml-1 bg-secondary/20" variant="default">
								{playerData.activeItems.length}
							</Badge>
						)}
					</Link>
				</Button>

				{/* Right side buttons */}
				<div className="ml-auto flex items-center gap-2">
					<Button
						className="border-primary-foreground/30 text-primary-foreground hover:bg-primary/80"
						onClick={handleBalanceClick}
						size="sm"
						variant="outline"
					>
						<Icon icon={PlusSignIcon} />
						Бонусы: {playerData?.player.balance ?? 0}
					</Button>
					<Button
						className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
						onClick={handleClose}
						size="icon-sm"
						variant="ghost"
					>
						<Icon icon={Cancel01Icon}></Icon>
					</Button>
				</div>
			</div>
		</div>
	);
}
