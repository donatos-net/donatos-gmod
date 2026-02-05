interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-full p-8 text-center">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}
