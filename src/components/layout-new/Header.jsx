import { Moon, Sun, LogOut } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ title }) {
  const { isDark, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair do sistema?')) {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
      }
    }
  };

  return (
    <header className="h-16 lg:h-20 flex items-center justify-between px-4 md:px-6 lg:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
      <div className="ml-12 lg:ml-0">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
      </div>
      
      <div className="flex items-center gap-2">
        {user && (
          <div className="hidden md:flex items-center gap-2 mr-2 text-sm text-slate-600 dark:text-slate-400">
            <span>{user.email}</span>
          </div>
        )}
        
        <button
          onClick={toggleTheme}
          className="p-2 lg:p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          title={isDark ? 'Modo Claro' : 'Modo Escuro'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {user && (
          <button
            onClick={handleLogout}
            className="p-2 lg:p-3 rounded-xl bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
    </header>
  );
}