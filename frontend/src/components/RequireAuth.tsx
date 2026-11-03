import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import type { Role } from '../types/api';
import { Spinner } from './ui';
import { Page } from './Layout';

/** Redirects to /login (remembering the target) when signed out, and shows 403 for the wrong role. */
export function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner className="py-24" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) {
    return (
      <Page>
        <div className="mx-auto max-w-md py-16 text-center">
          <p className="text-5xl font-bold text-slate-300">403</p>
          <p className="mt-3 font-semibold text-slate-900">Halaman ini tidak tersedia untuk akun Anda</p>
        </div>
      </Page>
    );
  }
  return <>{children}</>;
}
