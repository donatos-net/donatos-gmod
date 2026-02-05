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
		<div className="flex flex-col gap-0 bg-background p-1.5">
			<div className="flex items-center gap-2">
				<Button
					asChild
					className={cn(
						!!isShopActive &&
							'bg-secondary hover:bg-secondary dark:hover:bg-secondary',
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
						!!isInventoryActive &&
							'bg-secondary hover:bg-secondary dark:hover:bg-secondary',
					)}
					size="sm"
					variant="ghost"
				>
					<Link to="/donatos/inventory">
						<Icon icon={BlockchainIcon} />
						Инвентарь
						{playerData && playerData.inventoryItems.length > 0 && (
							<Badge className="ml-1 h-4 rounded-sm px-1" variant="default">
								{playerData.inventoryItems.length}
							</Badge>
						)}
					</Link>
				</Button>

				<Button
					asChild
					className={cn(
						!!isActiveItemsActive &&
							'bg-secondary hover:bg-secondary dark:hover:bg-secondary',
					)}
					size="sm"
					variant="ghost"
				>
					<Link to="/donatos/active-items">
						<Icon icon={Calendar02Icon} />
						Активные предметы
						{playerData && playerData.activeItems.length > 0 && (
							<Badge className="ml-1 h-4 rounded-sm px-1" variant="default">
								{playerData.activeItems.length}
							</Badge>
						)}
					</Link>
				</Button>

				{/* Right side buttons */}
				<div className="ml-auto flex items-center gap-2">
					<Button onClick={handleBalanceClick} size="sm" variant="outline">
						<Icon icon={PlusSignIcon} />
						Бонусы: {playerData?.player.balance ?? 0}
					</Button>
					<Button onClick={handleClose} size="icon-sm" variant="secondary">
						<Icon icon={Cancel01Icon}></Icon>
					</Button>
				</div>
			</div>
		</div>
	);
}
