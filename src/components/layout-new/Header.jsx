import { Moon, Sun, LogOut, LayoutGrid, ChevronDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSystem } from '../../contexts/SystemContext';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

export default function Header({ title }) {
  const { isDark, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const { clearSystem } = useSystem();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTrocarSistema = () => {
    setDropdownOpen(false);
    clearSystem();
    navigate('/selecionar-sistema');
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
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
          <div className="relative" ref={dropdownRef}>
            {/* Botão do menu de saída */}
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1 p-2 lg:p-3 rounded-xl bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              title="Opções de saída"
            >
              <LogOut size={20} />
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                <button
                  onClick={handleTrocarSistema}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <LayoutGrid size={16} className="text-orange-500 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-medium">Trocar sistema</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Voltar à seleção</div>
                  </div>
                </button>

                <div className="border-t border-slate-200 dark:border-slate-700" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={16} className="flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-medium">Sair</div>
                    <div className="text-xs text-red-400 dark:text-red-500">Encerrar sessão</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}