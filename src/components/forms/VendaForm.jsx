import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vendaSchema } from '../../utils/schemas';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import Modal from '../modals/Modal';
import ClienteForm from './ClienteForm';
import { useClientes } from '../../hooks/useClientes';
import { useEstoque } from '../../hooks/useEstoque';

export default function VendaForm({ onSubmit, clientes, initialData, onClienteAdicionado }) {
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clientesExtras, setClientesExtras] = useState([]);
  const [formInitialized, setFormInitialized] = useState(false);
  const { adicionarCliente } = useClientes();
  const { produtos, listarProdutos } = useEstoque();

  useEffect(() => {
    listarProdutos();
  }, [listarProdutos]);

  const clientePendenteRef = useRef(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(vendaSchema),
    defaultValues: {
      clienteId: '',
      dataVenda: new Date().toISOString().split('T')[0],
      itens: [{ produto: '', quantidade: '', valorUnitario: '' }],
      status: 'em_andamento',
      formaPagamento: 'dinheiro',
      observacoes: ''
    }
  });

  // Atualizar formulário quando initialData mudar (apenas uma vez)
  useEffect(() => {
    if (formInitialized) return;

    // Só atualiza o formulário se os produtos já foram carregados (quando editando)
    if (initialData && (!initialData.itens || initialData.itens.length === 0 || produtos.length > 0)) {
      const itensFormatados = (initialData.itens || []).map(item => ({
        produto: item.produto || item.produtoId || item.id || '',
        quantidade: item.quantidade || '',
        valorUnitario: item.valorUnitario || item.preco || ''
      }));

      reset({
        clienteId: initialData.clienteId || '',
        dataVenda: initialData.dataVenda ? 
          (typeof initialData.dataVenda === 'string' ? initialData.dataVenda.split('T')[0] : 
           initialData.dataVenda.toDate ? new Date(initialData.dataVenda.toDate()).toISOString().split('T')[0] :
           new Date(initialData.dataVenda).toISOString().split('T')[0]) :
          new Date().toISOString().split('T')[0],
        itens: itensFormatados.length > 0 ? itensFormatados : [{ produto: '', quantidade: '', valorUnitario: '' }],
        status: initialData.status || 'em_andamento',
        formaPagamento: initialData.formaPagamento || 'dinheiro',
        observacoes: initialData.observacoes || ''
      });
      setFormInitialized(true);
    } else if (!initialData) {
      reset({
        clienteId: '',
        dataVenda: new Date().toISOString().split('T')[0],
        itens: [{ produto: '', quantidade: '', valorUnitario: '' }],
        status: 'em_andamento',
        formaPagamento: 'dinheiro',
        observacoes: ''
      });
      setFormInitialized(true);
    }
  }, [initialData, reset, produtos, formInitialized]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "itens"
  });

  // Função para preencher automaticamente o preço quando selecionar o produto
  const handleProdutoChange = (index, produtoId) => {
    if (produtoId) {
      const produtoSelecionado = produtos.find(p => p.id === produtoId);
      if (produtoSelecionado && produtoSelecionado.precoVenda) {
        setValue(`itens.${index}.valorUnitario`, produtoSelecionado.precoVenda);
        calcularTotal();
      }
    }
  };

  // Lista completa de clientes (vindos do pai + extras locais)
  const todosClientes = useMemo(() => {
    const clientesMap = new Map();
    
    // Adiciona clientes vindos do pai
    (clientes || []).forEach(cliente => {
      if (cliente?.id) {
        clientesMap.set(cliente.id, cliente);
      }
    });
    
    // Adiciona clientes extras (recém-cadastrados)
    clientesExtras.forEach(cliente => {
      if (cliente?.id) {
        clientesMap.set(cliente.id, cliente);
      }
    });
    
    return Array.from(clientesMap.values()).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [clientes, clientesExtras]);

  // Valor atual do campo clienteId
  const clienteIdAtual = watch('clienteId');

  // Monitora mudanças na lista de clientes para aplicar seleção pendente
  useEffect(() => {
    const idPendente = clientePendenteRef.current;
    if (!idPendente) return;

    // Verifica se o cliente está na lista oficial (vinda do pai)
    const clienteNaListaOficial = (clientes || []).some(c => c.id === idPendente);
    
    if (clienteNaListaOficial) {
      // Remove dos extras já que agora está na lista oficial
      setClientesExtras(prev => prev.filter(c => c.id !== idPendente));
      
      // Garante que ainda está selecionado
      if (clienteIdAtual !== idPendente) {
        setValue('clienteId', idPendente, { 
          shouldDirty: true, 
          shouldTouch: true, 
          shouldValidate: true 
        });
      }
      
      // Limpa a referência
      clientePendenteRef.current = null;
    }
  }, [clientes, clienteIdAtual, setValue]);

  // Calcula o valor total sempre que os itens mudarem
  const itens = watch('itens');
  const calcularTotal = () => {
    const total = itens.reduce((sum, item) => 
      sum + (item.quantidade || 0) * (item.valorUnitario || 0)
    , 0);
    setValue('valorTotal', total);
    return total;
  };

  const handleFormSubmit = async (data) => {
    try {
      // Adiciona o nome do cliente aos dados
      const clienteSelecionado = clientes.find(c => c.id === data.clienteId);
      
      const dadosParaEnviar = {
        ...data,
        clienteNome: clienteSelecionado?.nome,
        valorTotal: calcularTotal()
      };
      
      await onSubmit(dadosParaEnviar);
    } catch (error) {
      console.error('Erro ao salvar venda:', error);
      alert('Erro ao salvar venda: ' + error.message);
    }
  };

  const handleClienteAdicionado = async (dadosCliente) => {
    try {
      if (dadosCliente === null) {
        // Cancelar
        setShowClienteModal(false);
        return;
      }
      
      // Verifica se já existe um cliente com o mesmo nome/email/CPF
      const nomeNormalizado = dadosCliente.nome?.trim().toLowerCase();
      const emailNormalizado = dadosCliente.email?.trim().toLowerCase();
      const cpfNormalizado = dadosCliente.cpf?.trim();
      
      const clienteExistente = todosClientes.find(cliente => {
        const nomeExistente = cliente.nome?.trim().toLowerCase();
        const emailExistente = cliente.email?.trim().toLowerCase();
        const cpfExistente = cliente.cpf?.trim();
        
        return (nomeNormalizado && nomeExistente === nomeNormalizado) ||
               (emailNormalizado && emailExistente === emailNormalizado) ||
               (cpfNormalizado && cpfExistente === cpfNormalizado);
      });
      
      if (clienteExistente) {
        // Cliente já existe, apenas seleciona ele
        setValue('clienteId', clienteExistente.id, { 
          shouldDirty: true, 
          shouldTouch: true, 
          shouldValidate: true 
        });
        setShowClienteModal(false);
        alert(`Cliente "${clienteExistente.nome}" já existe e foi selecionado.`);
        return;
      }

      // Cadastra o cliente no Firebase
      const novoCliente = await adicionarCliente(dadosCliente);
      
      // Adiciona o cliente à lista local imediatamente para aparecer no select
      setClientesExtras(prev => {
        const jaExiste = prev.some(c => c.id === novoCliente.id);
        return jaExiste ? prev : [novoCliente, ...prev];
      });

      // Guarda o ID para seleção após o pai atualizar
      clientePendenteRef.current = novoCliente.id;
      
      // Seleciona imediatamente
      setValue('clienteId', novoCliente.id, { 
        shouldDirty: true, 
        shouldTouch: true, 
        shouldValidate: true 
      });

      // Notifica o componente pai para recarregar a lista oficial
      if (onClienteAdicionado) {
        try {
          await onClienteAdicionado(novoCliente);
        } catch (error) {
          console.error('Erro no callback do pai:', error);
        }
      }

      setShowClienteModal(false);
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      alert('Erro ao cadastrar cliente: ' + error.message);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Dados da Venda */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Cliente *
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                {...register('clienteId')}
                value={clienteIdAtual || ''}
              >
                <option value="">Selecione um cliente</option>
                {todosClientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowClienteModal(true)}
                className="flex items-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
                title="Cadastrar novo cliente"
              >
                <UserPlus size={18} />
              </button>
            </div>
            {errors.clienteId && (
              <p className="mt-1 text-sm text-red-600">{errors.clienteId.message}</p>
            )}
          </div>

          {/* Data da Venda */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Data da Venda *
            </label>
            <input
              type="date"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              {...register('dataVenda')}
            />
            {errors.dataVenda && (
              <p className="mt-1 text-sm text-red-600">{errors.dataVenda.message}</p>
            )}
          </div>
        </div>

        {/* Itens da Venda */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Produtos
            </h3>
            <button
              type="button"
              onClick={() => append({ produto: '', quantidade: '', valorUnitario: '' })}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              <Plus size={16} />
              Adicionar Produto
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Produto *
                    </label>
                    <select
                      className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      {...register(`itens.${index}.produto`, {
                        onChange: (e) => handleProdutoChange(index, e.target.value)
                      })}
                    >
                      <option value="">Selecione o produto</option>
                      {produtos.map(produto => (
                        <option key={produto.id} value={produto.id}>
                          {produto.nome} - Estoque: {produto.quantidade} {produto.unidade}
                        </option>
                      ))}
                    </select>
                    {errors.itens?.[index]?.produto && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.itens[index].produto.message}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="0"
                      className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      {...register(`itens.${index}.quantidade`, {
                        valueAsNumber: true,
                        onChange: calcularTotal
                      })}
                    />
                    {errors.itens?.[index]?.quantidade && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.itens[index].quantidade.message}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Valor Unitário *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      readOnly
                      {...register(`itens.${index}.valorUnitario`, {
                        valueAsNumber: true,
                        onChange: calcularTotal
                      })}
                    />
                    {errors.itens?.[index]?.valorUnitario && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.itens[index].valorUnitario.message}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2 flex items-end">
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
        </div>

        {/* Status, Forma de Pagamento e Valor Total */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-200 dark:border-slate-700 pt-6">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Status *
            </label>
            <select
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              {...register('status')}
            >
              <option value="em_andamento">Fiado</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
            )}
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Forma de Pagamento
            </label>
            <select
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              {...register('formaPagamento')}
            >
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="cartao_debito">Cartão de Débito</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="transferencia">Transferência</option>
              <option value="fiado">Fiado</option>
            </select>
            {errors.formaPagamento && (
              <p className="mt-1 text-sm text-red-600">{errors.formaPagamento.message}</p>
            )}
          </div>

          {/* Valor Total */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Valor Total
            </label>
            <div className="flex items-center h-12 px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                R$ {calcularTotal().toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Observações
          </label>
          <textarea
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all min-h-[100px]"
            placeholder="Informações adicionais sobre a venda..."
            {...register('observacoes')}
          />
          {errors.observacoes && (
            <p className="mt-1 text-sm text-red-600">{errors.observacoes.message}</p>
          )}
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 pt-6">
          <button
            type="button"
            onClick={() => onSubmit(null)}
            className="px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Salvando...' : initialData ? 'Atualizar Venda' : 'Cadastrar Venda'}
          </button>
        </div>
      </form>

      {/* Modal para cadastrar novo cliente */}
      <Modal
        isOpen={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        title="Cadastrar Novo Cliente"
        size="lg"
      >
        <ClienteForm
          onSubmit={handleClienteAdicionado}
        />
      </Modal>
    </div>
  );
}

