import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingCart,
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  BarChart2,
  Settings
} from 'lucide-react';
import Logo from '../ui/Logo';const menuItems = [
  { icon: ShoppingCart, label: 'Vendas', path: '/vendas' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Package, label: 'Estoque', path: '/estoque' },
  { icon: ShoppingBag, label: 'Compras', path: '/compras' },
  { icon: DollarSign, label: 'Financeiro', path: '/financeiro' },
  { icon: BarChart2, label: 'Relatórios', path: '/relatorios' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 fixed left-0 top-0 shadow-sm transition-colors">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <Logo size="md" />
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Sistema de Gestão</p>
      </div>
      {/* Menu */}
      <nav className="mt-6 px-4">
        <div className="space-y-2">
          {menuItems.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-l-4 border-orange-500 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title={label}
              >
                <Icon 
                  size={20} 
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      
      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-400 dark:text-slate-500 text-center">
          v1.0.0
        </div>
      </div>
    </aside>
  );
}