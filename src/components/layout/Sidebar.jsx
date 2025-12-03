import { Link, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, 
  Users, 
  Package, 
  DollarSign, 
  BarChart2, 
  Settings 
} from 'lucide-react';

const menuItems = [
  { icon: ShoppingCart, label: 'Vendas', path: '/vendas' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Package, label: 'Estoque', path: '/estoque' },
  { icon: DollarSign, label: 'Financeiro', path: '/financeiro' },
  { icon: BarChart2, label: 'Relatórios', path: '/relatorios' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 fixed left-0 top-0">
      <div className="p-4">
        <h1 className="text-xl font-bold text-primary-600">Depósito Serra do Félix</h1>
      </div>
      <nav className="mt-8">
        {menuItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 ${
                isActive ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-600' : ''
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}