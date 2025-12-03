import React from 'react';

// Componente de Skeleton para tabela de clientes
export function ClientesSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Nome</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Apelido</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Telefone</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">CPF/CNPJ</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">E-mail</th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700">
              <td className="px-6 py-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-32"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-24"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-28"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-36"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-40"></div>
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-end items-center gap-2">
                  <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                  <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                  <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Componente de Skeleton para cards de vendas
export function VendasSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-1"></div>
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
            </div>
            <div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-1"></div>
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
            </div>
            <div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12 mb-1"></div>
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-28"></div>
            </div>
          </div>
          
          <div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-2"></div>
            <div className="space-y-1">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Componente de Loading mais elegante
export function LoadingSpinner({ size = 'md', text = 'Carregando...' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-orange-500 mb-3`}></div>
      <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">{text}</p>
    </div>
  );
}

// Componente de Estado Vazio otimizado
export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionText, 
  onAction 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
        <Icon className="text-slate-400 dark:text-slate-500" size={24} />
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

// Componente de Skeleton para produtos
export function ProdutosSkeleton() {
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="p-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            </div>
            <div className="w-20 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
