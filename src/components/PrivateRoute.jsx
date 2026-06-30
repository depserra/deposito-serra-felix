import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSystem } from '../contexts/SystemContext';
import { LoadingSpinner } from './ui/LoadingComponents';

export default function PrivateRoute({ children, requireSystem = true }) {
  const { user, loading } = useAuth();
  const { activeSystem } = useSystem();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <LoadingSpinner text="Verificando autenticação..." />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireSystem && !activeSystem) return <Navigate to="/selecionar-sistema" replace />;

  return children;
}
