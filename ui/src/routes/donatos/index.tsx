import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/donatos/')({
  component: () => <Navigate to="/donatos/shop" />,
})
