import { z } from 'zod';

export const vendaSchema = z.object({
  clienteId: z.string().min(1, 'Cliente é obrigatório'),
  clienteNome: z.string().optional(),
  codigoVenda: z.string().optional(),
  dataVenda: z.string().min(1, 'Data da venda é obrigatória'),
  itens: z.array(z.object({
    produto: z.string().min(1, 'Produto é obrigatório'),
    quantidade: z.number().min(1, 'Quantidade deve ser maior que 0'),
    valorUnitario: z.number().min(0, 'Valor deve ser maior ou igual a 0'),
  })).min(1, 'Adicione pelo menos um item'),
  valorTotal: z.number().min(0, 'Valor total deve ser maior ou igual a 0').optional(),
  status: z.enum(['concluida', 'em_andamento', 'cancelada'], {
    required_error: 'Status é obrigatório'
  }),
  formaPagamento: z.enum(['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'fiado'], {
    required_error: 'Forma de pagamento é obrigatória'
  }).optional(),
  observacoes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres').optional()
});

export const clienteSchema = z.object({
  nome: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  apelido: z
    .string()
    .min(2, 'Apelido deve ter no mínimo 2 caracteres')
    .max(50, 'Apelido deve ter no máximo 50 caracteres')
    .optional()
    .or(z.literal('')),
  telefone: z
    .string()
    .min(10, 'Telefone deve ter no mínimo 10 dígitos')
    .max(11, 'Telefone deve ter no máximo 11 dígitos')
    .regex(/^\d+$/, 'Telefone deve conter apenas números'),
  cpf: z
    .string()
    .refine((val) => !val || val.length === 11 || val.length === 14, {
      message: 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos'
    })
    .refine((val) => !val || /^\d+$/.test(val), {
      message: 'CPF/CNPJ deve conter apenas números'
    })
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  endereco: z
    .string()
    .max(200, 'Endereço deve ter no máximo 200 caracteres')
    .optional()
    .or(z.literal('')),
  cidade: z
    .string()
    .max(100, 'Cidade deve ter no máximo 100 caracteres')
    .optional()
    .or(z.literal('')),
  estado: z
    .string()
    .length(2, 'Estado deve ter 2 caracteres (sigla)')
    .optional()
    .or(z.literal('')),
  cep: z
    .string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP deve estar no formato 00000-000')
    .optional()
    .or(z.literal('')),
  observacoes: z
    .string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional()
    .or(z.literal(''))
});