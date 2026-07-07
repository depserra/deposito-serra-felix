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
  quantidade: z.preprocess(val => val === '' ? 0 : val, z.coerce.number().min(0, 'Quantidade deve ser maior ou igual a 0')),
  estoqueMinimo: z.preprocess(val => val === '' ? 0 : val, z.coerce.number().min(0, 'Estoque mínimo deve ser maior ou igual a 0')),
  precoCompra: z.preprocess(val => val === '' ? 0 : val, z.coerce.number().min(0, 'Preço de compra deve ser maior ou igual a 0')),
  precoVenda: z.preprocess(val => val === '' ? 0 : val, z.coerce.number().min(0, 'Preço de venda deve ser maior ou igual a 0')),
  fornecedor: z.string().optional(),
  localizacao: z.string().optional(),
  // Campos de fracionamento (novos + retrocompatíveis)
  vendaFracionada:     z.boolean().optional(),
  permiteFragmentacao: z.boolean().optional(),  // alias mais descritivo
  fatorConversao:      z.preprocess(val => val === '' ? 1 : val, z.coerce.number().min(1).optional()),
  unidadeVenda:        z.string().optional(),
  precoVendaUnitario:  z.preprocess(val => val === '' ? 0 : val, z.coerce.number().min(0).optional()),
  incrementoMinimoVenda: z.preprocess(val => val === '' ? 0 : val, z.coerce.number().min(0).optional()),
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
      codigo:           initialData.codigo    || '',
      nome:             initialData.nome      || '',
      descricao:        initialData.descricao || '',
      categoria:        initialData.categoria || '',
      unidade:          initialData.unidade   || 'un',
      quantidade: (typeof initialData.quantidade === 'number' && initialData.quantidade % 1 !== 0) 
        ? parseFloat(initialData.quantidade.toFixed(3)) 
        : (initialData.quantidade !== undefined ? initialData.quantidade : ''),
      estoqueMinimo:        initialData.estoqueMinimo    !== undefined ? initialData.estoqueMinimo : '',
      precoCompra:          initialData.precoCompra      || '',
      precoVenda:           initialData.precoVenda       || '',
      fornecedor:           initialData.fornecedor       || '',
      localizacao:          initialData.localizacao      || '',
      vendaFracionada:      initialData.vendaFracionada      || initialData.permiteFragmentacao || false,
      permiteFragmentacao:  initialData.permiteFragmentacao  || initialData.vendaFracionada    || false,
      fatorConversao:       initialData.fatorConversao       || 1,
      unidadeVenda:         initialData.unidadeVenda          || 'un',
      precoVendaUnitario:   initialData.precoVendaUnitario    || '',
      incrementoMinimoVenda: initialData.incrementoMinimoVenda ?? 0,
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
      codigo:               '',
      nome:                 '',
      descricao:            '',
      categoria:            '',
      unidade:              'un',
      quantidade:           '',
      estoqueMinimo:        5,
      precoCompra:          '',
      precoVenda:           '',
      fornecedor:           '',
      localizacao:          '',
      vendaFracionada:      false,
      permiteFragmentacao:  false,
      fatorConversao:       1,
      unidadeVenda:         'un',
      precoVendaUnitario:   '',
      incrementoMinimoVenda: 0,
    }
  });

  const onSubmitForm = async (data) => {
    try {
      const fatNum = Number(data.fatorConversao) || 1;
      const isFracUnit = ['kg', 'g', 'l', 'ml', 'm', 'm2', 'm3'].includes(data.unidade?.toLowerCase());
      const fracionavel = fatNum > 1 || isFracUnit;

      const dadosProcessados = {
        ...data,
        quantidade:          Number(data.quantidade)    || 0,
        estoqueMinimo:       Number(data.estoqueMinimo) || 0,
        precoCompra:         Number(data.precoCompra)   || 0,
        precoVenda:          Number(data.precoVenda)    || 0,
        // Sincroniza campos de venda fracionada implicitamente
        vendaFracionada:     fracionavel,
        permiteFragmentacao: fracionavel,
        fatorConversao:      fatNum,
        unidadeVenda:        fracionavel ? (data.unidadeVenda || data.unidade || 'un') : (data.unidade || 'un'),
        precoVendaUnitario:  fracionavel ? (Number(data.precoVendaUnitario) || 0) : 0,
        incrementoMinimoVenda: Number(data.incrementoMinimoVenda) || 0,
      };
      await onSubmit(dadosProcessados);
    } catch (error) {
      if (!error.message?.includes('Já existe')) {
        console.error('Erro ao salvar produto:', error);
      }
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
            Unidade de Estoque *
          </label>
          <select
            {...register('unidade')}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="un">Unidade (un)</option>
            <option value="kg">Quilograma (kg)</option>
            <option value="g">Grama (g)</option>
            <option value="l">Litro (l)</option>
            <option value="ml">Mililitro (ml)</option>
            <option value="m">Metro (m)</option>
            <option value="m2">Metro² (m²)</option>
            <option value="m3">Metro³ (m³)</option>
            <option value="cx">Caixa (cx)</option>
            <option value="pct">Pacote (pct)</option>
            <option value="sc">Saco (sc)</option>
            <option value="fd">Fardo (fd)</option>
            <option value="rl">Rolo (rl)</option>
            <option value="pc">Peça (pc)</option>
          </select>
          {errors.unidade && (
            <p className="mt-1 text-sm text-red-500">{errors.unidade.message}</p>
          )}
        </div>
      </div>

      {/* Quantidade e Estoque Mínimo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Quantidade Atual em Estoque *
          </label>
          <input
            type="number"
            step="any"
            {...register('quantidade')}
            onWheel={(e) => e.target.blur()}
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
            step="any"
            {...register('estoqueMinimo')}
            onWheel={(e) => e.target.blur()}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="5"
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
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white">R$</span>
            <input
              type="number"
              step="any"
              {...register('precoCompra')}
              onWheel={(e) => e.target.blur()}
              className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="0,00"
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
              placeholder="0,00"
            />
          </div>
          {errors.precoVenda && (
            <p className="mt-1 text-sm text-red-500">{errors.precoVenda.message}</p>
          )}
        </div>
      </div>

      {/* Venda Fracionada / Conversão */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Venda Fracionada e Conversão de Embalagem
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Preencha se o produto for comprado em caixa/fardo e vendido por unidade, ou se for vendido fracionado por peso/volume.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Fator de Conversão
            </label>
            <input
              type="number"
              {...register('fatorConversao')}
              onWheel={(e) => e.target.blur()}
              placeholder="Ex: 10 (ex: Saco de 10kg)"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Qtd de sub-itens na embalagem</p>
            {errors.fatorConversao && (
              <p className="mt-1 text-sm text-red-500">{errors.fatorConversao.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Unidade de Venda
            </label>
            <select
              {...register('unidadeVenda')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="un">Unidade (un)</option>
              <option value="kg">Quilograma (kg)</option>
              <option value="g">Grama (g)</option>
              <option value="l">Litro (l)</option>
              <option value="ml">Mililitro (ml)</option>
              <option value="m">Metro (m)</option>
              <option value="m2">Metro² (m²)</option>
              <option value="pc">Peça (pc)</option>
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Unidade de fração ao vender</p>
            {errors.unidadeVenda && (
              <p className="mt-1 text-sm text-red-500">{errors.unidadeVenda.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Preço Venda Unitário
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
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Deixe em branco para auto-calcular</p>
            {errors.precoVendaUnitario && (
              <p className="mt-1 text-sm text-red-500">{errors.precoVendaUnitario.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Incremento Mínimo
            </label>
            <input
              type="number"
              step="any"
              min="0"
              {...register('incrementoMinimoVenda')}
              onWheel={(e) => e.target.blur()}
              placeholder="0 = livre"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Ex: 0.1 para frações de 100g</p>
            {errors.incrementoMinimoVenda && (
              <p className="mt-1 text-sm text-red-500">{errors.incrementoMinimoVenda.message}</p>
            )}
          </div>
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
