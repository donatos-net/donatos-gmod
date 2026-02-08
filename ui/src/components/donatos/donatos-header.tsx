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
import { usePlayerExternalId } from '@/hooks/use-player-external-id'
import { useServerConfig } from '@/hooks/use-server-config'
import { closeUi, openExternalUrl } from '@/lib/gmod-bridge'
import { cn } from '@/lib/utils'
import { Icon } from '../icon'
import { ButtonGroup } from '../ui/button-group'

export function DonatosHeader() {
	const { data: playerData } = usePlayerData()
	const { data: playerExternalId } = usePlayerExternalId()
	const { data: serverConfig } = useServerConfig()
	const { closeDialog, openDialog } = useDonatosDialog()
	const matchRoute = useMatchRoute()
	const canUseBalanceActions = serverConfig && playerExternalId

	const handleBalanceClick = () => {
		if (!canUseBalanceActions) return

		const payUrl = serverConfig.payUrl.replace('{id}', playerExternalId)
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
		'px-2.5 text-foreground/70 hover:bg-background/45 dark:hover:bg-background/25 hover:text-foreground focus-visible:border-foreground/30 focus-visible:ring-foreground/30'
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
		<div className="donatos-header-surface flex w-full flex-row gap-0 px-2 py-1.5 text-foreground">
			<div className="flex flex-1 items-center gap-1.5">
				{navItems.map((item) => (
					<Button
						asChild
						className={cn(
							navButtonClass,
							item.isActive && 'bg-background/45 text-foreground/90',
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
									className="ml-1 h-4 min-w-4 rounded-sm border-foreground/10 bg-foreground/20 px-1 text-[10px] text-foreground leading-none"
									variant="secondary"
								>
									{item.badgeCount}
								</Badge>
							) : null}
						</Link>
					</Button>
				))}
			</div>

			<div className="flex items-center gap-2.5 pl-2">
				<ButtonGroup>
					<Button
						className="dark:border-foreground/15 dark:bg-foreground/10"
						disabled={!canUseBalanceActions}
						onClick={handleBalanceClick}
						size="sm"
						variant="outline"
					>
						Бонусы: {playerData?.player.balance ?? 0}
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								className="dark:border-foreground/15 dark:bg-foreground/10"
								size="sm"
								variant="outline"
							>
								<Icon icon={MoreVerticalIcon} />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								disabled={!canUseBalanceActions}
								onClick={handleBalanceClick}
							>
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
				</ButtonGroup>
				<Avatar size="sm" title={playerName || undefined}>
					<AvatarImage alt={playerName || 'Player avatar'} src={avatarUrl} />
					<AvatarFallback>{avatarFallbackText}</AvatarFallback>
				</Avatar>
				<Button onClick={() => closeUi()} size="icon-sm" variant="ghost">
					<Icon icon={Cancel01Icon}></Icon>
				</Button>
			</div>
		</div>
	)
}
