import {
	BlockchainIcon,
	Calendar02Icon,
	Cancel01Icon,
	PlusSignIcon,
	ShoppingBagIcon,
} from '@hugeicons/core-free-icons'
import { Link, useMatchRoute } from '@tanstack/react-router'
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
	const matchRoute = useMatchRoute()

	const handleBalanceClick = () => {
		if (!playerData || !serverConfig) return
		const payUrl = serverConfig.payUrl.replace(
			'{id}',
			playerData.player.externalId,
		)
		openExternalUrl(`${payUrl}&openDeposit=true`)
	}

	const handleClose = () => {
		closeUi()
	}

	const isShopActive = matchRoute({ to: '/donatos/shop' })
	const isInventoryActive = matchRoute({ to: '/donatos/inventory' })
	const isActiveItemsActive = matchRoute({ to: '/donatos/active-items' })
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
						onClick={handleClose}
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
