import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

interface FreezeConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

export function FreezeConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
}: FreezeConfirmDialogProps) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Заморозить предмет</DialogTitle>
					<DialogDescription>
						Заморозить этот предмет можно только 1 раз. Продолжить?
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button size="sm" variant="outline">
							Отмена
						</Button>
					</DialogClose>
					<Button
						onClick={() => {
							onConfirm();
							onOpenChange(false);
						}}
						size="sm"
					>
						Заморозить
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
