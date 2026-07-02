import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSystem } from '../../contexts/SystemContext';

// Categorias por sistema
const CATEGORIAS = {
  deposito: [
    'Cimento', 'Areia', 'Brita', 'Tijolo', 'Bloco', 'Ferro',
    'Madeira', 'Tinta', 'Ferramentas', 'Hidráulica', 'Elétrica',
    'Telha', 'Laje', 'Argamassa', 'Cal', 'Impermeabilizante',
    'Parafusos e Pregos', 'Tubos e Conexões', 'Piso e Revestimento',
    'Porta e Janela', 'Gesso', 'Drywall',
  ],
  racao: [
    'Ração para Cão', 'Ração para Gato', 'Ração para Ave',
    'Ração para Bovino', 'Ração para Suíno', 'Ração para Equino',
    'Ração para Ovino / Caprino', 'Ração para Coelho',
    'Suplemento Animal', 'Sal Mineral', 'Premix',
    'Vacina e Medicamento', 'Antiparasitário', 'Vitaminas',
    'Ração Artesanal / Natural', 'Petisco', 'Areia Higiênica',
    'Cama para Animal', 'Acessório Pet', 'Inseto / Grilo',
    'Sementes e Grãos', 'Adubos e Fertilizantes',
    'Defensivo Agrícola', 'Equipamento Agropecuário',
  ],
};

const produtoSchema = z.object({
  codigo: z.string().optional(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  categoria: z.string().min(1, 'Categoria é obrigatória'),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  quantidade: z.coerce.number().min(0, 'Quantidade deve ser maior ou igual a 0'),
  estoqueMinimo: z.coerce.number().min(0, 'Estoque mínimo deve ser maior ou igual a 0'),
  precoCompra: z.coerce.number().min(0, 'Preço de compra deve ser maior ou igual a 0'),
  precoVenda: z.coerce.number().min(0, 'Preço de venda deve ser maior ou igual a 0'),
  fornecedor: z.string().optional(),
  localizacao: z.string().optional(),
  vendaFracionada: z.boolean().optional(),
  fatorConversao: z.preprocess(val => val === '' ? 1 : val, z.coerce.number().min(1).optional()),
  unidadeVenda: z.string().optional(),
  precoVendaUnitario: z.preprocess(val => val === '' ? 0 : val, z.coerce.number().min(0).optional())
});

export default function ProdutoForm({ onSubmit, initialData, onCancel }) {
  const { activeSystem } = useSystem();
  const isRacao = activeSystem?.id === 'racao';
  const categoriasList = isRacao ? CATEGORIAS.racao : CATEGORIAS.deposito;
  const categoriasPlaceholder = isRacao
    ? 'Ex: Ração para Cão, Sal Mineral...'
    : 'Ex: Cimento, Areia, Tijolo...';
  const formattedInitialData = useMemo(() => {
    if (!initialData) return null;
    return {
      codigo: initialData.codigo || '',
      nome: initialData.nome || '',
      descricao: initialData.descricao || '',
      categoria: initialData.categoria || '',
      unidade: initialData.unidade || 'un',
      quantidade: (typeof initialData.quantidade === 'number' && initialData.quantidade % 1 !== 0) 
        ? parseFloat(initialData.quantidade.toFixed(3)) 
        : (initialData.quantidade || 0),
      estoqueMinimo: initialData.estoqueMinimo || 0,
      precoCompra: initialData.precoCompra || '',
      precoVenda: initialData.precoVenda || '',
      fornecedor: initialData.fornecedor || '',
      localizacao: initialData.localizacao || '',
      vendaFracionada: initialData.vendaFracionada || false,
      fatorConversao: initialData.fatorConversao || 1,
      unidadeVenda: initialData.unidadeVenda || 'un',
      precoVendaUnitario: initialData.precoVendaUnitario || ''
    };
  }, [initialData]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset
  } = useForm({
    resolver: zodResolver(produtoSchema),
    defaultValues: formattedInitialData || {
      codigo: '',
      nome: '',
      descricao: '',
      categoria: '',
      unidade: 'un',
      quantidade: 0,
      estoqueMinimo: 5,
      precoCompra: '',
      precoVenda: '',
      fornecedor: '',
      localizacao: '',
      vendaFracionada: false,
      fatorConversao: 1,
      unidadeVenda: 'un',
      precoVendaUnitario: ''
    }
  });

  const watchVendaFracionada = watch('vendaFracionada');

  const onSubmitForm = async (data) => {
    try {
      const dadosProcessados = {
        ...data,
        quantidade: Number(data.quantidade) || 0,
        estoqueMinimo: Number(data.estoqueMinimo) || 0,
        precoCompra: Number(data.precoCompra) || 0,
        precoVenda: Number(data.precoVenda) || 0,
        vendaFracionada: !!data.vendaFracionada,
        fatorConversao: data.vendaFracionada ? (Number(data.fatorConversao) || 1) : 1,
        unidadeVenda: data.vendaFracionada ? (data.unidadeVenda || 'un') : (data.unidade || 'un'),
        precoVendaUnitario: data.vendaFracionada ? (Number(data.precoVendaUnitario) || 0) : 0
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
            placeholder={categoriasPlaceholder}
            list="categorias"
            autoComplete="off"
          />
          <datalist id="categorias">
            {categoriasList.map((cat) => (
              <option key={cat} value={cat} />
            ))}
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
            <option value="milh">Milheiro (milh)</option>
          </select>
          {errors.unidade && (
            <p className="mt-1 text-sm text-red-500">{errors.unidade.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Quantidade em Estoque *
          </label>
          <input
            type="number"
            {...register('quantidade')}
            onWheel={(e) => e.target.blur()}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder=""
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
            {...register('estoqueMinimo')}
            onWheel={(e) => e.target.blur()}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder=""
          />
          {errors.estoqueMinimo && (
            <p className="mt-1 text-sm text-red-500">{errors.estoqueMinimo.message}</p>
          )}
        </div>
      </div>

      {/* Aviso sobre registro automático de compra */}
      {!initialData && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Registro automático de compra</p>
              <p>Se você informar quantidade e preço de compra, uma compra será registrada automaticamente na seção de compras para controle do estoque inicial.</p>
            </div>
          </div>
        </div>
      )}

      {/* Preços */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Preço de Compra *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white">R$</span>
            <input
              type="number"
              step="any"
              {...register('precoCompra')}
              onWheel={(e) => e.target.blur()}
              className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder=""
            />
          </div>
          {errors.precoCompra && (
            <p className="mt-1 text-sm text-red-500">{errors.precoCompra.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Preço de Venda *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white">R$</span>
            <input
              type="number"
              step="any"
              {...register('precoVenda')}
              onWheel={(e) => e.target.blur()}
              className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder=""
            />
          </div>
          {errors.precoVenda && (
            <p className="mt-1 text-sm text-red-500">{errors.precoVenda.message}</p>
          )}
        </div>
      </div>

      {/* Venda Fracionada */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <input
            id="vendaFracionada"
            type="checkbox"
            {...register('vendaFracionada')}
            className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-slate-300 dark:bg-slate-700 dark:border-slate-600 cursor-pointer"
          />
          <label
            htmlFor="vendaFracionada"
            className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
          >
            Vender este produto de forma fracionada ou unitária (Ex: Caixa fechada vendida por unidade)
          </label>
        </div>

        {watchVendaFracionada && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Fator de Conversão *
              </label>
              <input
                type="number"
                {...register('fatorConversao')}
                onWheel={(e) => e.target.blur()}
                placeholder="Ex: 100"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Quantidade de itens por embalagem</p>
              {errors.fatorConversao && (
                <p className="mt-1 text-sm text-red-500">{errors.fatorConversao.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Unidade de Venda *
              </label>
              <select
                {...register('unidadeVenda')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="un">Unidade (un)</option>
                <option value="kg">Quilograma (kg)</option>
                <option value="g">Grama (g)</option>
                <option value="m">Metro (m)</option>
                <option value="l">Litro (l)</option>
              </select>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Unidade ao vender fracionado</p>
              {errors.unidadeVenda && (
                <p className="mt-1 text-sm text-red-500">{errors.unidadeVenda.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Preço de Venda Unitário
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white">R$</span>
                <input
                  type="number"
                  step="any"
                  {...register('precoVendaUnitario')}
                  onWheel={(e) => e.target.blur()}
                  placeholder="Calculado se vazio"
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Deixe em branco para calcular automaticamente</p>
              {errors.precoVendaUnitario && (
                <p className="mt-1 text-sm text-red-500">{errors.precoVendaUnitario.message}</p>
              )}
            </div>
          </div>
        )}
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
