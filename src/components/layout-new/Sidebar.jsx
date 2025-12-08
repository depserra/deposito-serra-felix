import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingCart,
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  BarChart2,
  Menu,
  X
} from 'lucide-react';
import Logo from '../ui/Logo';

const menuItems = [
  { icon: ShoppingCart, label: 'Vendas', path: '/vendas' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Package, label: 'Estoque', path: '/estoque' },
  { icon: ShoppingBag, label: 'Compras', path: '/compras' },
  { icon: DollarSign, label: 'Financeiro', path: '/financeiro' },
  { icon: BarChart2, label: 'Relatórios', path: '/relatorios' },
];

export default function Sidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg"
      >
        {isOpen ? <X size={24} className="text-slate-700 dark:text-slate-300" /> : <Menu size={24} className="text-slate-700 dark:text-slate-300" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 fixed left-0 top-0 shadow-sm transition-all duration-300 z-40 flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
      {/* Logo */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <Logo size="md" />
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Sistema de Gestão</p>
      </div>
      {/* Menu - Scrollable */}
      <nav className="flex-1 overflow-y-auto mt-6 px-4 pb-20">
        <div className="space-y-2">
          {menuItems.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setIsOpen(false)}
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
      
      {/* Footer - Fixed at bottom */}
      <div className="flex-shrink-0 p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="text-xs text-slate-400 dark:text-slate-500 text-center">
          v1.0.0
        </div>
      </div>
    </aside>
    </>
  );
}