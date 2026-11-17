import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Role } from '../../types/domain';
import { useAuth } from './AuthProvider';
import { homePath } from '../../config/navigation';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/States';

function FullPageMessage({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">{children}</div>;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, retry } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <FullPageMessage>
        <Spinner size={28} className="text-brand" />
        <span className="sr-only">Loading your workspace</span>
      </FullPageMessage>
    );
  }
  if (status === 'error') {
    return (
      <FullPageMessage>
        <p className="type-heading-sm">Could not reach VoxDesk</p>
        <p className="text-ink-muted">Check your connection and try again.</p>
        <Button variant="primary" onClick={retry}>
          Try again
        </Button>
      </FullPageMessage>
    );
  }
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/**
 * Keeps each role inside its own dashboard. This is a navigation guard only:
 * the backend still checks the role on every request.
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.role !== role) return <Navigate to={homePath(session.user.role)} replace />;
  return <>{children}</>;
}

export function HomeRedirect() {
  const { session } = useAuth();
  return <Navigate to={session ? homePath(session.user.role) : '/login'} replace />;
}
