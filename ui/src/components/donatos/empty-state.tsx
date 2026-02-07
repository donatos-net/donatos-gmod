interface EmptyStateProps {
	message: string
}

export function EmptyState({ message }: EmptyStateProps) {
	return (
		<div className="flex h-full items-center justify-center p-8 text-center">
			<div className="rounded-md border border-border/70 bg-card/70 px-5 py-4">
				<p className="text-muted-foreground text-sm">{message}</p>
			</div>
		</div>
	)
}
