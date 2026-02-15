import { useMemo, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useGiftItem } from '@/hooks/use-donatos-mutations'
import { useOnlinePlayers } from '@/hooks/use-online-players'
import type { InventoryItem } from '@/types/donatos'
import { useDonatosDialog } from './dynamic-dialog'
import { useDonatosError } from './error-dialog'

export function InventoryGiftDialog({ item }: { item: InventoryItem }) {
	const { closeDialog } = useDonatosDialog()
	const { showError } = useDonatosError()
	const { data: onlinePlayers = [], isLoading: isLoadingPlayers } =
		useOnlinePlayers()
	const { mutateAsync: giftItem } = useGiftItem()

	const [selectedPlayerExternalId, setSelectedPlayerExternalId] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const selectedPlayer = useMemo(
		() =>
			onlinePlayers.find(
				(player) => player.externalId === selectedPlayerExternalId,
			),
		[onlinePlayers, selectedPlayerExternalId],
	)

	const submitDisabled =
		isSubmitting ||
		isLoadingPlayers ||
		onlinePlayers.length === 0 ||
		selectedPlayerExternalId.length === 0

	return (
		<>
			<DialogHeader>
				<DialogTitle>Подарить предмет</DialogTitle>
				<DialogDescription>
					Выберите игрока, которому хотите подарить{' '}
					{item.goods?.name ?? 'этот предмет'}.
				</DialogDescription>
			</DialogHeader>

			{isLoadingPlayers ? (
				<div className="flex items-center gap-2 text-muted-foreground text-xs">
					<Spinner />
					Загружаем список игроков...
				</div>
			) : onlinePlayers.length === 0 ? (
				<p className="text-muted-foreground text-xs">
					На сервере нет доступных игроков для подарка.
				</p>
			) : (
				<Select
					onValueChange={setSelectedPlayerExternalId}
					value={selectedPlayerExternalId}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Выберите игрока" />
					</SelectTrigger>
					<SelectContent className="max-h-56" position="popper">
						{onlinePlayers.map((player) => (
							<SelectItem key={player.externalId} value={player.externalId}>
								<div className="flex items-center gap-2">
									<Avatar className="size-5">
										<AvatarImage src={player.avatarUrl} />
										<AvatarFallback>
											{player.name.slice(0, 1).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<span>{player.name}</span>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}

			<DialogFooter>
				<DialogClose asChild>
					<Button size="sm" variant="outline">
						Отмена
					</Button>
				</DialogClose>
				<Button
					disabled={submitDisabled}
					onClick={async () => {
						if (!selectedPlayer) {
							return
						}

						setIsSubmitting(true)
						try {
							try {
								await giftItem({
									itemId: item.id,
									gifteeExternalId: selectedPlayer.externalId,
								})
								closeDialog()
							} catch (error) {
								showError(error)
							}
						} finally {
							setIsSubmitting(false)
						}
					}}
					size="sm"
				>
					{isSubmitting && <Spinner data-icon="inline-start" />}
					Подарить
				</Button>
			</DialogFooter>
		</>
	)
}
