import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { useDonatosError } from '@/components/donatos/error-dialog';
import { Progress } from '@/components/ui/progress';
import { useFreezeItem, useUnfreezeItem } from '@/hooks/use-donatos-mutations';
import type { ActiveItem } from '@/types/donatos';

import { FreezeConfirmDialog } from './freeze-confirm-dialog';

interface ActiveItemCardProps {
	item: ActiveItem;
}

export function ActiveItemCard({ item }: ActiveItemCardProps) {
	const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
	const { mutate: freezeItem } = useFreezeItem();
	const { mutate: unfreezeItem } = useUnfreezeItem();
	const { showError } = useDonatosError();

	const progressPercent = item.expires
		? (item.expires.inS / item.expires.durationS) * 100
		: 100;

	const statusText = item.isFrozen
		? 'заморожен'
		: item.expires
			? `истекает через ${item.expires.in}`
			: 'навсегда';

	const canInteract = item.isFrozen || item.expires;

	return (
		<>
			<Card className="bg-card" size="sm">
				<CardHeader>
					<CardTitle>{item.goods.name}</CardTitle>
					{canInteract && (
						<CardAction>
							{item.isFrozen ? (
								<Button
									onClick={() =>
										unfreezeItem(item.id, {
											onError: (error) => showError(getErrorMessage(error)),
										})
									}
									size="xs"
								>
									Разморозить
								</Button>
							) : (
								<Button onClick={() => setFreezeDialogOpen(true)} size="xs">
									Заморозить
								</Button>
							)}
						</CardAction>
					)}
					<p className="text-muted-foreground text-xs">{statusText}</p>
				</CardHeader>
				{item.expires && !item.isFrozen && (
					<CardContent>
						<Progress value={progressPercent} />
					</CardContent>
				)}
			</Card>

			<FreezeConfirmDialog
				onConfirm={() =>
					freezeItem(item.id, {
						onError: (error) => showError(getErrorMessage(error)),
					})
				}
				onOpenChange={setFreezeDialogOpen}
				open={freezeDialogOpen}
			/>
		</>
	);
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error && error.message) return error.message;
	return 'Не удалось выполнить действие. Попробуйте еще раз.';
}
