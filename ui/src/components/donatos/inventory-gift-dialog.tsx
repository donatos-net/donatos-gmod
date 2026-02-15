import { useMemo, useState } from 'react'
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '@/components/ui/avatar'
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
import type { OnlinePlayer } from '@/types/donatos'

interface InventoryGiftDialogProps {
	itemName: string
	players: OnlinePlayer[]
	isLoadingPlayers: boolean
	onConfirm: (gifteeExternalId: string) => Promise<void> | void
}

export function InventoryGiftDialog({
	itemName,
	players,
	isLoadingPlayers,
	onConfirm,
}: InventoryGiftDialogProps) {
	const [selectedPlayerExternalId, setSelectedPlayerExternalId] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const selectedPlayer = useMemo(
		() =>
			players.find(
				(player) => player.externalId === selectedPlayerExternalId,
			),
		[players, selectedPlayerExternalId],
	)

	const submitDisabled =
		isSubmitting ||
		isLoadingPlayers ||
		players.length === 0 ||
		selectedPlayerExternalId.length === 0

	return (
		<>
			<DialogHeader>
				<DialogTitle>Подарить предмет</DialogTitle>
				<DialogDescription>
					Выберите игрока, которому хотите подарить {itemName}.
				</DialogDescription>
			</DialogHeader>

			{isLoadingPlayers ? (
				<div className="flex items-center gap-2 text-muted-foreground text-xs">
					<Spinner />
					Загружаем список игроков...
				</div>
			) : players.length === 0 ? (
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
						<SelectContent>
							{players.map((player) => (
								<SelectItem key={player.externalId} value={player.externalId}>
									<div className="flex items-center gap-2">
										<Avatar size="sm">
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
							await onConfirm(selectedPlayer.externalId)
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
