import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Search } from 'lucide-react';
import { useEstoque } from '../../hooks/useEstoque';

// Schema de validação
const compraSchema = z.object({
  fornecedor: z.string().min(1, 'Fornecedor é obrigatório'),
  dataCompra: z.string().min(1, 'Data é obrigatória'),
  itens: z.array(
    z.object({
      nomeProduto: z.string().min(1, 'Nome do produto é obrigatório'),
      categoria: z.string().optional(),
      quantidade: z.string().min(1, 'Quantidade é obrigatória'),
      valorCompra: z.string().min(1, 'Valor de compra é obrigatório'),
      valorVenda: z.string().min(1, 'Valor de venda é obrigatório')
    })
  ).min(1, 'Adicione pelo menos um item'),
  formaPagamento: z.string().optional(),
  observacoes: z.string().optional()
});

export default function CompraForm({ onSubmit, initialData }) {
  const [valorTotal, setValorTotal] = useState(0);
  const [produtoSugestoes, setProdutoSugestoes] = useState({});
  const [inputFocado, setInputFocado] = useState(null);
  const [formInitialized, setFormInitialized] = useState(false);
  const dropdownRefs = useRef({});
  const { produtos, listarProdutos } = useEstoque();

  useEffect(() => {
    listarProdutos();
  }, [listarProdutos]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(compraSchema),
    defaultValues: {
      fornecedor: '',
      dataCompra: new Date().toISOString().split('T')[0],
      itens: [{ nomeProduto: '', categoria: '', quantidade: '', valorCompra: '', valorVenda: '' }],
      formaPagamento: '',
      observacoes: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "itens"
  });

  // Observar TODOS os campos do formulário para atualização em tempo real
  const watchedValues = watch();

  // Inicializar formulário com initialData (apenas uma vez)
  useEffect(() => {
    if (formInitialized) return;

    if (initialData) {
      const itensFormatados = (initialData.itens || []).map(item => ({
        nomeProduto: item.nomeProduto || '',
        categoria: item.categoria || '',
        quantidade: item.quantidade?.toString() || '',
        valorCompra: item.valorCompra?.toString() || item.valorUnitario?.toString() || '',
        valorVenda: item.valorVenda?.toString() || ''
      }));

      reset({
        fornecedor: initialData.fornecedor || '',
        dataCompra: initialData.dataCompra ? 
          (typeof initialData.dataCompra === 'string' ? initialData.dataCompra.split('T')[0] : 
           initialData.dataCompra.toDate ? new Date(initialData.dataCompra.toDate()).toISOString().split('T')[0] :
           new Date(initialData.dataCompra).toISOString().split('T')[0]) :
          new Date().toISOString().split('T')[0],
        itens: itensFormatados.length > 0 ? itensFormatados : [{ nomeProduto: '', categoria: '', quantidade: '', valorCompra: '', valorVenda: '' }],
        formaPagamento: initialData.formaPagamento || '',
        observacoes: initialData.observacoes || ''
      });
      setFormInitialized(true);
    } else {
      setFormInitialized(true);
    }
  }, [initialData, reset, formInitialized]);

  // Recalcular total sempre que qualquer valor mudar
  useEffect(() => {
    if (watchedValues.itens && Array.isArray(watchedValues.itens)) {
      const total = watchedValues.itens.reduce((acc, item) => {
        const quantidade = parseFloat(item.quantidade) || 0;
        const valorCompra = parseFloat(item.valorCompra) || 0;
        return acc + (quantidade * valorCompra);
      }, 0);
      setValorTotal(total);
    }
  }, [watchedValues]);

  // Função para buscar produtos similares
  const buscarProdutosSimilares = (texto, index) => {
    if (!texto || texto.length < 2) {
      setProdutoSugestoes(prev => ({ ...prev, [index]: [] }));
      return;
    }

    const textoLower = texto.toLowerCase();
    const similares = produtos.filter(p => 
      p.nome?.toLowerCase().includes(textoLower)
    ).slice(0, 5);

    setProdutoSugestoes(prev => ({ ...prev, [index]: similares }));
  };

  // Função para selecionar produto da lista
  const selecionarProduto = (index, produto) => {
    setValue(`itens.${index}.nomeProduto`, produto.nome);
    setValue(`itens.${index}.categoria`, produto.categoria || '');
    setValue(`itens.${index}.valorCompra`, produto.precoCompra || produto.valorCompra || '');
    setValue(`itens.${index}.valorVenda`, produto.precoVenda || produto.valorVenda || '');
    setProdutoSugestoes(prev => ({ ...prev, [index]: [] }));
    setInputFocado(null);
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      let isInside = false;
      Object.values(dropdownRefs.current).forEach(ref => {
        if (ref && ref.contains(event.target)) {
          isInside = true;
        }
      });
      if (!isInside) {
        setInputFocado(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleFormSubmit = async (data) => {
    const dadosProcessados = {
      ...data,
      valorTotal,
      itens: data.itens.map(item => ({
        ...item,
        quantidade: parseFloat(item.quantidade),
        valorCompra: parseFloat(item.valorCompra),
        valorVenda: parseFloat(item.valorVenda)
      }))
    };
    await onSubmit(dadosProcessados);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Dados da Compra */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Fornecedor *
          </label>
          <input
            type="text"
            {...register('fornecedor')}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            placeholder="Nome do fornecedor"
          />
          {errors.fornecedor && (
            <p className="mt-1 text-sm text-red-600">{errors.fornecedor.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Data da Compra *
          </label>
          <input
            type="date"
            {...register('dataCompra')}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
          />
          {errors.dataCompra && (
            <p className="mt-1 text-sm text-red-600">{errors.dataCompra.message}</p>
          )}
        </div>
      </div>

      {/* Itens da Compra */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Produtos Comprados
          </h3>
          <button
            type="button"
            onClick={() => append({ nomeProduto: '', categoria: '', quantidade: '', valorCompra: '', valorVenda: '' })}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <Plus size={16} />
            Adicionar Produto
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-14 gap-4">
                <div className="md:col-span-3 relative">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Nome do Produto *
                  </label>
                  <div className="relative" ref={el => dropdownRefs.current[index] = el}>
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
                    <input
                      type="text"
                      {...register(`itens.${index}.nomeProduto`)}
                      onChange={(e) => {
                        register(`itens.${index}.nomeProduto`).onChange(e);
                        buscarProdutosSimilares(e.target.value, index);
                      }}
                      onFocus={() => {
                        setInputFocado(index);
                        const valor = watchedValues.itens?.[index]?.nomeProduto;
                        if (valor) buscarProdutosSimilares(valor, index);
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Digite o nome..."
                      autoComplete="off"
                    />
                  
                    {/* Dropdown de sugestões */}
                    {inputFocado === index && produtoSugestoes[index]?.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 px-2">
                            Produtos existentes no estoque:
                          </p>
                          {produtoSugestoes[index].map((produto) => (
                            <div
                              key={produto.id}
                              onClick={() => selecionarProduto(index, produto)}
                              className="w-full text-left px-3 py-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {produto.nome}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {produto.categoria} • Estoque: {produto.quantidade || 0}
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                                  R$ {(produto.precoCompra || produto.valorUnitario || 0).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {errors.itens?.[index]?.nomeProduto && (
                    <p className="mt-1 text-sm text-red-600">{errors.itens[index].nomeProduto.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Categoria
                  </label>
                  <input
                    type="text"
                    {...register(`itens.${index}.categoria`)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ex: Materiais"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`itens.${index}.quantidade`)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0"
                  />
                  {errors.itens?.[index]?.quantidade && (
                    <p className="mt-1 text-sm text-red-600">{errors.itens[index].quantidade.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Valor de Compra *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`itens.${index}.valorCompra`)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                  />
                  {errors.itens?.[index]?.valorCompra && (
                    <p className="mt-1 text-sm text-red-600">{errors.itens[index].valorCompra.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Valor de Venda *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`itens.${index}.valorVenda`)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                  />
                  {errors.itens?.[index]?.valorVenda && (
                    <p className="mt-1 text-sm text-red-600">{errors.itens[index].valorVenda.message}</p>
                  )}
                </div>

                <div className="md:col-span-1 flex items-end">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="w-full px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remover item"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {errors.itens && (
          <p className="mt-2 text-sm text-red-600">{errors.itens.message}</p>
        )}
      </div>

      {/* Forma de Pagamento e Observações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 dark:border-slate-700 pt-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Forma de Pagamento
          </label>
          <select
            {...register('formaPagamento')}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
          >
            <option value="">Selecione...</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao">Cartão</option>
            <option value="boleto">Boleto</option>
            <option value="transferencia">Transferência</option>
            <option value="cheque">Cheque</option>
            <option value="prazo">A Prazo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Valor Total
          </label>
          <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold text-lg">
            R$ {valorTotal.toFixed(2)}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Observações
        </label>
        <textarea
          {...register('observacoes')}
          rows={3}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all resize-none"
          placeholder="Informações adicionais sobre a compra..."
        />
      </div>

      {/* Botões */}
      <div className="flex gap-4 justify-end border-t border-slate-200 dark:border-slate-700 pt-6">
        <button
          type="button"
          onClick={() => onSubmit(null)}
          className="px-6 py-3 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Salvando...' : initialData ? 'Atualizar Compra' : 'Salvar Compra'}
        </button>
      </div>
    </form>
  );
}
