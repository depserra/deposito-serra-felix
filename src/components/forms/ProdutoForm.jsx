import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const produtoSchema = z.object({
  codigo: z.string().optional(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  categoria: z.string().min(1, 'Categoria é obrigatória'),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  quantidade: z.number().min(0, 'Quantidade deve ser maior ou igual a 0'),
  estoqueMinimo: z.number().min(0, 'Estoque mínimo deve ser maior ou igual a 0'),
  precoCompra: z.number().min(0, 'Preço de compra deve ser maior ou igual a 0'),
  precoVenda: z.number().min(0, 'Preço de venda deve ser maior ou igual a 0'),
  fornecedor: z.string().optional(),
  localizacao: z.string().optional()
});

export default function ProdutoForm({ onSubmit, initialData, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm({
    resolver: zodResolver(produtoSchema),
    defaultValues: initialData || {
      codigo: '',
      nome: '',
      descricao: '',
      categoria: '',
      unidade: 'un',
      quantidade: 0,
      estoqueMinimo: 0,
      precoCompra: 0,
      precoVenda: 0,
      fornecedor: '',
      localizacao: ''
    }
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const onSubmitForm = async (data) => {
    try {
      const dadosProcessados = {
        ...data,
        quantidade: parseFloat(data.quantidade) || 0,
        estoqueMinimo: parseFloat(data.estoqueMinimo) || 0,
        precoCompra: parseFloat(data.precoCompra) || 0,
        precoVenda: parseFloat(data.precoVenda) || 0
      };
      await onSubmit(dadosProcessados);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Erro ao salvar produto: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* Informações Básicas */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Nome *
        </label>
        <input
          type="text"
          {...register('nome')}
          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Nome do produto"
        />
        {errors.nome && (
          <p className="mt-1 text-sm text-red-500">{errors.nome.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Descrição
        </label>
        <textarea
          {...register('descricao')}
          rows={3}
          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Descrição do produto"
        />
      </div>

      {/* Categoria e Unidade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Categoria *
          </label>
          <input
            type="text"
            {...register('categoria')}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Ex: Cimento, Areia, Tijolo..."
            list="categorias"
          />
          <datalist id="categorias">
            <option value="Cimento" />
            <option value="Areia" />
            <option value="Brita" />
            <option value="Tijolo" />
            <option value="Bloco" />
            <option value="Ferro" />
            <option value="Madeira" />
            <option value="Tinta" />
            <option value="Ferramentas" />
            <option value="Hidráulica" />
            <option value="Elétrica" />
          </datalist>
          {errors.categoria && (
            <p className="mt-1 text-sm text-red-500">{errors.categoria.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Unidade *
          </label>
          <select
            {...register('unidade')}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="un">Unidade (un)</option>
            <option value="kg">Quilograma (kg)</option>
            <option value="m">Metro (m)</option>
            <option value="m²">Metro Quadrado (m²)</option>
            <option value="m³">Metro Cúbico (m³)</option>
            <option value="l">Litro (l)</option>
            <option value="sc">Saco (sc)</option>
            <option value="cx">Caixa (cx)</option>
            <option value="pç">Peça (pç)</option>
          </select>
          {errors.unidade && (
            <p className="mt-1 text-sm text-red-500">{errors.unidade.message}</p>
          )}
        </div>
      </div>

      {/* Estoque */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Quantidade em Estoque *
          </label>
          <input
            type="number"
            step="0.01"
            {...register('quantidade', { valueAsNumber: true })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="0"
          />
          {errors.quantidade && (
            <p className="mt-1 text-sm text-red-500">{errors.quantidade.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Estoque Mínimo *
          </label>
          <input
            type="number"
            step="0.01"
            {...register('estoqueMinimo', { valueAsNumber: true })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="0"
          />
          {errors.estoqueMinimo && (
            <p className="mt-1 text-sm text-red-500">{errors.estoqueMinimo.message}</p>
          )}
        </div>
      </div>

      {/* Preços */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Preço de Compra *
          </label>
          <input
            type="number"
            step="0.01"
            {...register('precoCompra', { valueAsNumber: true })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="0.00"
          />
          {errors.precoCompra && (
            <p className="mt-1 text-sm text-red-500">{errors.precoCompra.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Preço de Venda *
          </label>
          <input
            type="number"
            step="0.01"
            {...register('precoVenda', { valueAsNumber: true })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="0.00"
          />
          {errors.precoVenda && (
            <p className="mt-1 text-sm text-red-500">{errors.precoVenda.message}</p>
          )}
        </div>
      </div>

      {/* Outras Informações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Fornecedor
          </label>
          <input
            type="text"
            {...register('fornecedor')}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Nome do fornecedor"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Localização
          </label>
          <input
            type="text"
            {...register('localizacao')}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Ex: Prateleira A3, Galpão 2..."
          />
        </div>
      </div>

      {/* Botões */}
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary"
        >
          {isSubmitting ? 'Salvando...' : initialData ? 'Atualizar' : 'Cadastrar'}
        </button>
      </div>
    </form>
  );
}
