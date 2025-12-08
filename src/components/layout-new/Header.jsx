import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function Header({ title }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="h-16 lg:h-20 flex items-center justify-between px-4 md:px-6 lg:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
      <div className="ml-12 lg:ml-0">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
      </div>
      
      <button
        onClick={toggleTheme}
        className="p-2 lg:p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
        title={isDark ? 'Modo Claro' : 'Modo Escuro'}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </header>
  );
}