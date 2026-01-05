/**
 * Constantes globais do sistema
 */

// Duração do cache (2 minutos)
export const CACHE_DURATION = 2 * 60 * 1000;

// Opções de unidade para produtos
export const UNIDADES = [
  { value: 'un', label: 'Unidade' },
  { value: 'kg', label: 'Quilograma' },
  { value: 'g', label: 'Grama' },
  { value: 'l', label: 'Litro' },
  { value: 'ml', label: 'Mililitro' },
  { value: 'm', label: 'Metro' },
  { value: 'm2', label: 'Metro Quadrado' },
  { value: 'm3', label: 'Metro Cúbico' },
  { value: 'cx', label: 'Caixa' },
  { value: 'pct', label: 'Pacote' },
  { value: 'sc', label: 'Saco' },
  { value: 'milh', label: 'Milheiro' }
];

// Status de transações
export const STATUS = {
  PAGO: 'pago',
  PENDENTE: 'pendente',
  PARCIAL: 'parcial',
  CANCELADO: 'cancelado'
};

// Tipos de pagamento
export const TIPOS_PAGAMENTO = {
  DINHEIRO: 'dinheiro',
  PIX: 'pix',
  CARTAO_CREDITO: 'cartao_credito',
  CARTAO_DEBITO: 'cartao_debito',
  BOLETO: 'boleto',
  TRANSFERENCIA: 'transferencia'
};

// Cores do tema
export const COLORS = {
  PRIMARY: '#2563eb',
  SECONDARY: '#64748b',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#3b82f6'
};

// Configurações de paginação
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
};
