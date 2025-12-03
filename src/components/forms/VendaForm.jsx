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
  const { adicionarCliente } = useClientes();
  const { produtos, listarProdutos } = useEstoque();

  useEffect(() => {
    listarProdutos();
  }, [listarProdutos]);

  const clientePendenteRef = useRef(null);  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(vendaSchema),
    defaultValues: initialData || {
      clienteId: '',
      dataVenda: new Date().toISOString().split('T')[0],
      itens: [{ produto: '', quantidade: '', valorUnitario: '' }],
      status: 'em_andamento',
      observacoes: ''
    }
  });

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
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
        {/* Cliente */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Cliente *
          </label>
          <div className="flex gap-3">
            <select
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
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
              className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl font-medium transition-all duration-200"
              title="Cadastrar novo cliente"
            >
              <UserPlus size={18} />
              Novo
            </button>
          </div>
          {errors.clienteId && (
            <p className="mt-2 text-sm text-red-500">{errors.clienteId.message}</p>
          )}
        </div>

        {/* Data da Venda */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Data da Venda *
          </label>
          <input
            type="date"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
            {...register('dataVenda')}
          />
          {errors.dataVenda && (
            <p className="mt-2 text-sm text-red-500">{errors.dataVenda.message}</p>
          )}
        </div>
      </div>

      {/* Itens da Venda */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Itens da Venda *
        </label>
        
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5">
              <select
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
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

            <div className="col-span-2">
              <input
                type="number"
                min="1"
                placeholder="Qtd"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
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

            <div className="col-span-3">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Valor Unit."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
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
            </div>            <div className="col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => remove(index)}
                className="btn btn-icon btn-outline-danger"
                disabled={fields.length === 1}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => append({ produto: '', quantidade: '', valorUnitario: '' })}
          className="btn btn-outline w-full flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Adicionar Item
        </button>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Status *
        </label>
        <select
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
          {...register('status')}
        >
          <option value="em_andamento">Em Andamento</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>
        {errors.status && (
          <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
        )}
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Observações
        </label>
        <textarea
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 min-h-[100px]"
          {...register('observacoes')}
        />
        {errors.observacoes && (
          <p className="mt-1 text-sm text-red-600">{errors.observacoes.message}</p>
        )}
      </div>

      {/* Valor Total */}
      <div className="flex justify-between items-center py-2 border-t">
        <span className="text-lg font-medium">Valor Total:</span>
        <span className="text-lg font-bold text-primary-600">
          R$ {calcularTotal().toFixed(2)}
        </span>
      </div>

      {/* Botões */}
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={() => onSubmit(null)}
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

