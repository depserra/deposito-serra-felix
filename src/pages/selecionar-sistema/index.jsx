import { useNavigate } from 'react-router-dom';
import { useSystem } from '../../contexts/SystemContext';
import { useAuth } from '../../contexts/AuthContext';
import { Warehouse, PawPrint, ArrowRight, LogOut } from 'lucide-react';

const sistemas = [
  {
    id: 'deposito',
    icon: Warehouse,
    title: 'Depósito Serra Félix',
    description: 'Gestão de vendas, estoque e financeiro de material de construção',
    gradient: 'from-orange-500 to-amber-500',
    cardBorder: 'border-orange-200 dark:border-orange-800/50',
    hoverBorder: 'hover:border-orange-400 dark:hover:border-orange-500',
    hoverBg: 'hover:bg-orange-50 dark:hover:bg-orange-900/10',
    iconBg: 'bg-orange-100 dark:bg-orange-900/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
    arrowColor: 'text-orange-500',
    available: true,
  },
  {
    id: 'racao',
    icon: PawPrint,
    title: 'Casa de Ração',
    description: 'Gestão de vendas, estoque e financeiro de ração e pet shop',
    gradient: 'from-green-500 to-emerald-500',
    cardBorder: 'border-green-200 dark:border-green-800/50',
    hoverBorder: 'hover:border-green-400 dark:hover:border-green-500',
    hoverBg: 'hover:bg-green-50 dark:hover:bg-green-900/10',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
    iconColor: 'text-green-600 dark:text-green-400',
    arrowColor: 'text-green-500',
    available: true,
  },
];

export default function SelecionarSistemaPage() {
  const navigate = useNavigate();
  const { selectSystem } = useSystem();
  const { logout, user } = useAuth();

  const handleSelect = (sistema) => {
    if (!sistema.available) return;
    selectSystem(sistema.id);
    navigate('/vendas');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg mb-4 border border-slate-200 dark:border-slate-700">
            <span className="text-3xl">🏢</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Selecione o Sistema
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Olá, <span className="font-medium text-slate-700 dark:text-slate-300">{user?.email}</span>! Em qual sistema deseja entrar?
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {sistemas.map((sistema) => {
            const Icon = sistema.icon;
            return (
              <button
                key={sistema.id}
                onClick={() => handleSelect(sistema)}
                disabled={!sistema.available}
                className={`
                  relative group text-left w-full
                  bg-white dark:bg-slate-800
                  border-2 ${sistema.cardBorder} ${sistema.available ? sistema.hoverBorder + ' ' + sistema.hoverBg : ''}
                  rounded-2xl p-6 shadow-sm
                  transition-all duration-200
                  ${sistema.available
                    ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
                    : 'cursor-not-allowed opacity-60'
                  }
                `}
              >
                {/* Badge Em breve */}
                {!sistema.available && (
                  <span className="absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    Em breve
                  </span>
                )}

                {/* Ícone */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${sistema.iconBg} mb-4`}>
                  <Icon size={24} className={sistema.iconColor} />
                </div>

                {/* Conteúdo */}
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                  {sistema.title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {sistema.description}
                </p>

                {/* Seta */}
                {sistema.available && (
                  <div className={`mt-4 flex items-center gap-1 text-sm font-medium ${sistema.arrowColor} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                    Acessar
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <div className="text-center">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
          >
            <LogOut size={16} />
            Sair da conta
          </button>
        </div>

      </div>
    </div>
  );
}
