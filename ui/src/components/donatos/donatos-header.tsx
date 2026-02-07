import {
	BlockchainIcon,
	Calendar02Icon,
	Cancel01Icon,
	Coins02Icon,
	MoreVerticalIcon,
	PlusSignIcon,
	ShoppingBagIcon,
} from '@hugeicons/core-free-icons'
import { Link, useMatchRoute } from '@tanstack/react-router'
import { useDonatosDialog } from '@/components/donatos/dynamic-dialog'
import { IgsDepositDialog } from '@/components/donatos/igs-deposit-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePlayerData } from '@/hooks/use-player-data'
import { useServerConfig } from '@/hooks/use-server-config'
import { closeUi, openExternalUrl } from '@/lib/gmod-bridge'
import { cn } from '@/lib/utils'
import { Icon } from '../icon'

export function DonatosHeader() {
	const { data: playerData } = usePlayerData()
	const { data: serverConfig } = useServerConfig()
	const { closeDialog, openDialog } = useDonatosDialog()
	const matchRoute = useMatchRoute()

	const handleBalanceClick = () => {
		if (!playerData || !serverConfig) return

		const payUrl = serverConfig.payUrl.replace(
			'{id}',
			playerData.player.externalId,
		)
		openExternalUrl(`${payUrl}&openDeposit=true`)
	}

	const handleIgsDepositClick = () => {
		if (!serverConfig?.igs.enabled) return

		openDialog(
			<IgsDepositDialog initialSum={100} onBack={() => closeDialog()} />,
		)
	}

	const isShopActive = matchRoute({ to: '/donatos/shop' })
	const isInventoryActive = matchRoute({ to: '/donatos/inventory' })
	const isActiveItemsActive = matchRoute({ to: '/donatos/active-items' })
	const navButtonClass =
		'text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground focus-visible:border-primary-foreground/30 focus-visible:ring-primary-foreground/30 dark:hover:bg-primary-foreground/20'
	const navItems = [
		{
			to: '/donatos/shop' as const,
			icon: ShoppingBagIcon,
			label: 'Магазин',
			isActive: !!isShopActive,
		},
		{
			to: '/donatos/inventory' as const,
			icon: BlockchainIcon,
			label: 'Инвентарь',
			isActive: !!isInventoryActive,
			badgeCount: playerData?.inventoryItems.length ?? 0,
		},
		{
			to: '/donatos/active-items' as const,
			icon: Calendar02Icon,
			label: 'Активные предметы',
			isActive: !!isActiveItemsActive,
			badgeCount: playerData?.activeItems.length ?? 0,
		},
	]
	const avatarUrl = playerData?.player.externalMeta?.avatarUrl ?? undefined
	const playerName = playerData?.player.externalMeta?.name?.trim() ?? ''
	const avatarFallbackText =
		playerName
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('') || '??'

	return (
		<div className="relative flex flex-col gap-0 overflow-hidden bg-background p-1.5 text-primary-foreground">
			<div
				aria-hidden
				className="donatos-animated-bg pointer-events-none absolute inset-0 opacity-60"
			/>
			<div className="relative z-10 flex items-center gap-1">
				{navItems.map((item) => (
					<Button
						asChild
						className={cn(
							navButtonClass,
							item.isActive &&
								'bg-primary-foreground/20 text-primary-foreground',
						)}
						key={item.to}
						size="sm"
						variant="ghost"
					>
						<Link to={item.to}>
							<Icon icon={item.icon} />
							{item.label}
							{item.badgeCount && item.badgeCount > 0 ? (
								<Badge
									className="ml-1 h-4 min-w-4 bg-primary-foreground/15 px-1 text-[10px] text-primary-foreground leading-none"
									variant="default"
								>
									{item.badgeCount}
								</Badge>
							) : null}
						</Link>
					</Button>
				))}

				{/* Right side buttons */}
				<div className="ml-auto flex items-center gap-3">
					<div className="inline-flex overflow-hidden rounded-md border border-primary-foreground/30">
						<Button
							className="rounded-none border-0 text-primary-foreground hover:bg-primary/80"
							onClick={handleBalanceClick}
							size="sm"
							variant="outline"
						>
							Бонусы: {playerData?.player.balance ?? 0}
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									className="rounded-none border-0 border-primary-foreground/30 border-l text-primary-foreground hover:bg-primary/80"
									size="sm"
									variant="outline"
								>
									<Icon icon={MoreVerticalIcon} />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={handleBalanceClick}>
									<Icon icon={PlusSignIcon} />
									Пополнить баланс
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={!serverConfig?.igs.enabled}
									onClick={handleIgsDepositClick}
								>
									<Icon icon={Coins02Icon} />
									Другие способы
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<Avatar size="sm" title={playerName || undefined}>
						<AvatarImage alt={playerName || 'Player avatar'} src={avatarUrl} />
						<AvatarFallback>{avatarFallbackText}</AvatarFallback>
					</Avatar>
					<Button
						className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
						onClick={() => closeUi()}
						size="icon-sm"
						variant="ghost"
					>
						<Icon icon={Cancel01Icon}></Icon>
					</Button>
				</div>
			</div>
		</div>
	)
}
