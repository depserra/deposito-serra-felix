import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vendaSchema } from '../../utils/schemas';
import { Plus, Trash2, UserPlus, CheckCircle, Circle } from 'lucide-react';
import Modal from '../modals/Modal';
import ClienteForm from './ClienteForm';
import { useClientes } from '../../hooks/useClientes';
import { useEstoque } from '../../hooks/useEstoque';
import { useFinanceiro } from '../../hooks/useFinanceiro';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function VendaForm({ onSubmit, clientes, initialData, onClienteAdicionado, onReloadVendas }) {
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clientesExtras, setClientesExtras] = useState([]);
  const [formInitialized, setFormInitialized] = useState(false);
  const [errosEstoque, setErrosEstoque] = useState({});
  const [mostrarParcelamento, setMostrarParcelamento] = useState(false);
  const [parcelas, setParcelas] = useState([]);
  const { adicionarCliente } = useClientes();
  const { produtos, listarProdutos } = useEstoque();
  const { contasReceber, listarContasReceber, receberConta } = useFinanceiro();

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
      desconto: 0,
      observacoes: '',
      parcelamento: {
        numeroParcelas: 1,
        diaVencimento: 1,
        valorParcela: 0
      }
    }
  });

  // Watch para campos de parcelamento
  const statusWatch = watch('status');
  const numeroParcelas = watch('parcelamento.numeroParcelas');

  // Controlar exibição dos campos de parcelamento
  useEffect(() => {
    setMostrarParcelamento(statusWatch === 'parcelado');
    if (statusWatch !== 'parcelado') {
      setValue('parcelamento.numeroParcelas', 1);
      setValue('parcelamento.diaVencimento', 1);
    }
  }, [statusWatch, setValue]);

  // Calcular valor da parcela quando número de parcelas mudar
  useEffect(() => {
    if (mostrarParcelamento && numeroParcelas > 0) {
      const total = calcularTotal().total;
      const valorParcela = total / numeroParcelas;
      setValue('parcelamento.valorParcela', valorParcela);
    }
  }, [numeroParcelas, mostrarParcelamento, setValue]);

  // Atualizar formulário quando initialData mudar (apenas uma vez)
  useEffect(() => {
    if (formInitialized) return;

    // Só atualiza o formulário se os produtos já foram carregados (quando editando)
    if (initialData && (!initialData.itens || initialData.itens.length === 0 || produtos.length > 0)) {
      const itensFormatados = (initialData.itens || []).map(item => ({
        produto: item.produto || item.produtoId || item.id || '',
        quantidade: item.quantidade ? Math.round(Number(item.quantidade)) : '',
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
        desconto: initialData.desconto || 0,
        observacoes: initialData.observacoes || '',
        parcelamento: initialData.parcelamento || {
          numeroParcelas: 1,
          diaVencimento: 1,
          valorParcela: 0
        }
      });
      setFormInitialized(true);
    } else if (!initialData) {
      reset({
        clienteId: '',
        dataVenda: new Date().toISOString().split('T')[0],
        itens: [{ produto: '', quantidade: '', valorUnitario: '' }],
        status: 'em_andamento',
        formaPagamento: 'dinheiro',
        desconto: 0,
        observacoes: '',
        parcelamento: {
          numeroParcelas: 1,
          diaVencimento: 1,
          valorParcela: 0
        }
      });
      setFormInitialized(true);
    }
  }, [initialData, reset, produtos, formInitialized]);

  // Buscar parcelas quando editar venda parcelada
  useEffect(() => {
    if (initialData?.id && initialData?.status === 'parcelado') {
      listarContasReceber({ vendaId: initialData.id }).then(contas => {
        setParcelas(contas || []);
      }).catch(error => {
        console.error('Erro ao buscar parcelas:', error);
        setParcelas([]);
      });
    }
  }, [initialData, listarContasReceber]);

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
    // Limpa erro de estoque ao mudar o produto
    setErrosEstoque(prev => {
      const novos = { ...prev };
      delete novos[index];
      return novos;
    });
  };

  // Função para validar quantidade do estoque
  const validarQuantidadeEstoque = (index, quantidade) => {
    const produtoId = watch(`itens.${index}.produto`);
    if (!produtoId || !quantidade) {
      setErrosEstoque(prev => {
        const novos = { ...prev };
        delete novos[index];
        return novos;
      });
      return true;
    }

    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return true;

    let quantidadeDisponivel = produto.quantidade || 0;
    const quantidadeSolicitada = Number(quantidade);

    // Se estiver editando uma venda, considerar a quantidade original
    if (initialData && initialData.itens && initialData.itens[index]) {
      const itemOriginal = initialData.itens[index];
      // Se for o mesmo produto, adicionar a quantidade original ao disponível
      if (itemOriginal.produto === produtoId || itemOriginal.produtoId === produtoId || itemOriginal.id === produtoId) {
        const quantidadeOriginal = Number(itemOriginal.quantidade) || 0;
        quantidadeDisponivel += quantidadeOriginal;
      }
    }

    if (quantidadeSolicitada > quantidadeDisponivel) {
      setErrosEstoque(prev => ({
        ...prev,
        [index]: `Estoque insuficiente! Disponível: ${quantidadeDisponivel} ${produto.unidade || 'un'}`
      }));
      return false;
    }

    setErrosEstoque(prev => {
      const novos = { ...prev };
      delete novos[index];
      return novos;
    });
    return true;
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
  const desconto = watch('desconto');
  
  const calcularTotal = () => {
    const subtotal = Math.round(itens.reduce((sum, item) => 
      sum + (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0)
    , 0) * 100) / 100;
    const total = Math.round((subtotal - (Number(desconto) || 0)) * 100) / 100;
    setValue('valorTotal', total);
    return { subtotal, total };
  };

  const handleFormSubmit = async (data) => {
    try {
      // Valida estoque de todos os itens antes de submeter
      let temErroEstoque = false;
      data.itens.forEach((item, index) => {
        if (!validarQuantidadeEstoque(index, item.quantidade)) {
          temErroEstoque = true;
        }
      });

      if (temErroEstoque) {
        alert('Não é possível concluir a venda. Verifique a quantidade disponível no estoque.');
        return;
      }

      // Adiciona o nome do cliente aos dados
      const clienteSelecionado = clientes.find(c => c.id === data.clienteId);
      
      const { total } = calcularTotal();
      const dadosParaEnviar = {
        ...data,
        clienteNome: clienteSelecionado?.nome,
        valorTotal: total,
        desconto: Number(data.desconto) || 0,
        itens: data.itens.map(item => ({
          ...item,
          quantidade: Number(item.quantidade) || 0,
          valorUnitario: Number(item.valorUnitario) || 0
        }))
      };
      
      await onSubmit(dadosParaEnviar);
      
      // Se for parcelado, mostrar mensagem informativa
      if (data.status === 'parcelado' && data.parcelamento?.numeroParcelas) {
        alert(
          `Venda parcelada criada com sucesso!\n\n` +
          `Parcelas: ${data.parcelamento.numeroParcelas}x de R$ ${data.parcelamento.valorParcela?.toFixed(2)}\n` +
          `Vencimento: Todo dia ${data.parcelamento.diaVencimento}\n\n` +
          `✓ Primeira parcela registrada como PAGA hoje\n` +
          `✓ Demais parcelas criadas como CONTAS A RECEBER no financeiro`
        );
      }
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
            <div className="flex gap-2 items-stretch">
              <select
                className="flex-1 min-w-0 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
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
                className="flex items-center justify-center flex-shrink-0 w-12 px-0 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors"
                title="Cadastrar novo cliente"
              >
                <UserPlus size={20} />
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
            {fields.map((field, index) => {
              const produtoSelecionadoId = watch(`itens.${index}.produto`);
              const produtoSelecionado = produtos.find(p => p.id === produtoSelecionadoId);
              
              return (
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
                    {produtoSelecionado && produtoSelecionado.precoCompra && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-white">
                        Valor de compra: <span className="font-semibold text-blue-600 dark:text-blue-400">
                          R$ {Number(produtoSelecionado.precoCompra).toFixed(2)}
                        </span>
                      </p>
                    )}
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
                      max="999999999"
                      step="1"
                      placeholder="0"
                      onWheel={(e) => e.target.blur()}
                      className={`w-full px-4 py-2 bg-white dark:bg-slate-700 border rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 ${
                        errosEstoque[index] 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-slate-200 dark:border-slate-600 focus:ring-orange-500'
                      }`}
                      {...register(`itens.${index}.quantidade`, {
                        onChange: calcularTotal,
                        onBlur: (e) => validarQuantidadeEstoque(index, e.target.value)
                      })}
                    />
                    {errosEstoque[index] && (
                      <p className="mt-1 text-sm text-red-600 font-medium">
                        {errosEstoque[index]}
                      </p>
                    )}
                    {errors.itens?.[index]?.quantidade && !errosEstoque[index] && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.itens[index].quantidade.message}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Valor Unitário *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        onWheel={(e) => e.target.blur()}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        readOnly
                        {...register(`itens.${index}.valorUnitario`, {
                          valueAsNumber: true,
                          onChange: calcularTotal
                        })}
                      />
                    </div>
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
            );
            })}
          </div>
        </div>

        {/* Status, Forma de Pagamento, Desconto e Valor Total */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <option value="parcelado">Parcelado</option>
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
                <option value="parcelado">Parcelado</option>
              </select>
              {errors.formaPagamento && (
                <p className="mt-1 text-sm text-red-600">{errors.formaPagamento.message}</p>
              )}
            </div>
          </div>

          {/* Campos de Parcelamento */}
          {mostrarParcelamento && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-4">Configurar Parcelamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Número de Parcelas */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Número de Parcelas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    {...register('parcelamento.numeroParcelas')}
                    onWheel={(e) => e.target.blur()}
                  />
                </div>

                {/* Dia de Vencimento */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Dia de Vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Ex: 10 (todo dia 10)"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    {...register('parcelamento.diaVencimento')}
                    onWheel={(e) => e.target.blur()}
                  />
                </div>

                {/* Valor da Parcela (calculado) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Valor de Cada Parcela
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`R$ ${(watch('parcelamento.valorParcela') || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 font-semibold cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Atenção:</strong> A primeira parcela será registrada como paga hoje. As demais parcelas serão criadas como contas a receber no financeiro.
                </p>
              </div>
            </div>
          )}

          {/* Resumo de Valores */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span>Subtotal:</span>
              <span className="font-semibold">R$ {calcularTotal().subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            {/* Campo de Desconto */}
            <div className="flex justify-between items-center gap-4">
              <label className="text-slate-700 dark:text-slate-300">Desconto:</label>
              <div className="relative w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  onWheel={(e) => e.target.blur()}
                  className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  {...register('desconto', {
                    valueAsNumber: true,
                    onChange: calcularTotal
                  })}
                />
              </div>
            </div>
            {errors.desconto && (
              <p className="text-sm text-red-600">{errors.desconto.message}</p>
            )}
            
            <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">Valor Total:</span>
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  R$ {calcularTotal().total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
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

        {/* Gerenciamento de Parcelas (apenas ao editar) */}
        {initialData && initialData.status === 'parcelado' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
              Parcelas da Venda {parcelas.length === 0 && '(Carregando...)'}
            </h3>
            {parcelas.length > 0 ? (
              <div className="space-y-3">
              {parcelas.map((parcela) => {
                const dataVencimento = parcela.dataVencimento instanceof Date 
                  ? parcela.dataVencimento 
                  : parcela.dataVencimento?.toDate?.() || new Date(parcela.dataVencimento);
                const isPago = parcela.status === 'pago';
                
                return (
                  <div key={parcela.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      {isPago ? (
                        <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                      ) : (
                        <Circle className="text-slate-400" size={24} />
                      )}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {parcela.descricao}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Vencimento: {dataVencimento.toLocaleDateString('pt-BR')}
                          {isPago && parcela.dataPagamento && (
                            <span className="ml-2 text-green-600 dark:text-green-400">
                              • Pago em {(
                                parcela.dataPagamento instanceof Date 
                                  ? parcela.dataPagamento 
                                  : parcela.dataPagamento?.toDate?.() || new Date(parcela.dataPagamento)
                              ).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        R$ {(parcela.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      {!isPago ? (
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm('Confirmar recebimento desta parcela?')) {
                              try {
                                await receberConta(parcela.id, {
                                  status: 'pago',
                                  dataPagamento: new Date(),
                                  valorRecebido: parcela.valor,
                                  valorTotal: parcela.valor
                                });
                                // Atualizar lista de parcelas
                                const contasAtualizadas = await listarContasReceber({ vendaId: initialData.id });
                                setParcelas(contasAtualizadas || []);
                                
                                // Verificar se todas as parcelas foram pagas
                                const todasPagas = contasAtualizadas.every(c => c.status === 'pago');
                                
                                if (todasPagas) {
                                  // Alterar o campo status do formulário para concluida
                                  setValue('status', 'concluida');
                                  
                                  alert('Todas as parcelas foram pagas! Clique em "Atualizar Venda" para concluir.');
                                }
                              } catch (error) {
                                console.error('Erro:', error);
                                alert('Erro ao marcar parcela como paga: ' + error.message);
                              }
                            }
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Marcar como Pago
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm('Deseja desmarcar esta parcela como paga?')) {
                              try {
                                await receberConta(parcela.id, {
                                  status: 'pendente',
                                  dataPagamento: null,
                                  valorRecebido: 0
                                });
                                // Atualizar lista de parcelas
                                const contasAtualizadas = await listarContasReceber({ vendaId: initialData.id });
                                setParcelas(contasAtualizadas || []);
                                
                                // Se a venda estava concluída, voltar para parcelado
                                setValue('status', 'parcelado');
                              } catch (error) {
                                console.error('Erro:', error);
                                alert('Erro ao desmarcar parcela: ' + error.message);
                              }
                            }
                          }}
                          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Desmarcar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            ) : (
              <p className="text-slate-600 dark:text-slate-400 text-sm">Nenhuma parcela encontrada para esta venda.</p>
            )}
          </div>
        )}

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

