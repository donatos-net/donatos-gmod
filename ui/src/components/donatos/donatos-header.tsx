import {
	BlockchainIcon,
	Calendar02Icon,
	Cancel01Icon,
	PlusSignIcon,
	ShoppingBagIcon,
} from '@hugeicons/core-free-icons'
import { Link, useMatchRoute } from '@tanstack/react-router'
import { DepositMethodDialog } from '@/components/donatos/deposit-method-dialog'
import { useDonatosDialog } from '@/components/donatos/dynamic-dialog'
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
	const { openDialog } = useDonatosDialog()
	const matchRoute = useMatchRoute()

	const handleBalanceClick = () => {
		if (!playerData || !serverConfig) return

		if (!serverConfig.igs.enabled) {
			const payUrl = serverConfig.payUrl.replace(
				'{id}',
				playerData.player.externalId,
			)
			openExternalUrl(`${payUrl}&openDeposit=true`)
			return
		}

		openDialog(
			<DepositMethodDialog
				igsEnabled={serverConfig.igs.enabled}
				payUrl={serverConfig.payUrl}
				playerExternalId={playerData.player.externalId}
			/>,
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
			<div className="relative z-10 flex items-center gap-2">
				{navItems.map((item) => (
					<Button
						asChild
						className={cn(
							navButtonClass,
							item.isActive &&
								'bg-primary-foreground/15 text-primary-foreground ring-1 ring-primary-foreground/30',
						)}
						key={item.to}
						size="sm"
						variant="ghost"
					>
						<Link to={item.to}>
							<Icon icon={item.icon} />
							{item.label}
							{item.badgeCount && item.badgeCount > 0 ? (
								<Badge className="ml-1 bg-secondary/20" variant="default">
									{item.badgeCount}
								</Badge>
							) : null}
						</Link>
					</Button>
				))}

				{/* Right side buttons */}
				<div className="ml-auto flex items-center gap-3">
					<Button
						className="border-primary-foreground/30 text-primary-foreground hover:bg-primary/80"
						onClick={handleBalanceClick}
						size="sm"
						variant="outline"
					>
						Бонусы: {playerData?.player.balance ?? 0}
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Avatar
								className="cursor-pointer"
								size="sm"
								title={playerName || undefined}
							>
								<AvatarImage
									alt={playerName || 'Player avatar'}
									src={avatarUrl}
								/>
								<AvatarFallback>{avatarFallbackText}</AvatarFallback>
							</Avatar>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={handleBalanceClick}>
								<Icon icon={PlusSignIcon} />
								Пополнить баланс
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
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
