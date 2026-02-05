import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
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
								<Button onClick={() => unfreezeItem(item.id)} size="xs">
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
				onConfirm={() => freezeItem(item.id)}
				onOpenChange={setFreezeDialogOpen}
				open={freezeDialogOpen}
			/>
		</>
	);
}
