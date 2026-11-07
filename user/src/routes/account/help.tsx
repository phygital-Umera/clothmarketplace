import {createFileRoute, Navigate} from '@tanstack/react-router';

// Help moved to /help so it works without signing in
export const Route = createFileRoute('/account/help')({component: () => <Navigate to="/help" replace />});
