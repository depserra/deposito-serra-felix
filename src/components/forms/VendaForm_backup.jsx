import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vendaSchema } from '../../utils/schemas';
import { Plus, Trash2 } from 'lucide-react';

export default function VendaForm({ onSubmit, clientes, initialData }) {
  const {
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
      itens: [{ produto: '', quantidade: 1, valorUnitario: 0 }],
      status: 'em_andamento',
      observacoes: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "itens"
  });

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
      await onSubmit({
        ...data,
        clienteNome: clienteSelecionado?.nome,
        valorTotal: calcularTotal()
      });
    } catch (error) {
      console.error('Erro ao salvar venda:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Cliente */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cliente *
          </label>
          <select
            className="input"
            {...register('clienteId')}
          >
            <option value="">Selecione um cliente</option>
            {clientes.map(cliente => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </option>
            ))}
          </select>
          {errors.clienteId && (
            <p className="mt-1 text-sm text-red-600">{errors.clienteId.message}</p>
          )}
        </div>

        {/* Data da Venda */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Data da Venda *
          </label>
          <input
            type="date"
            className="input"
            {...register('dataVenda')}
          />
          {errors.dataVenda && (
            <p className="mt-1 text-sm text-red-600">{errors.dataVenda.message}</p>
          )}
        </div>
      </div>

      {/* Itens da Venda */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Itens da Venda *
        </label>
        
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5">
              <input
                placeholder="Produto"
                className="input"
                {...register(`itens.${index}.produto`)}
              />
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
                className="input"
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
                className="input"
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

            <div className="col-span-2 flex justify-end">
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
          onClick={() => append({ produto: '', quantidade: 1, valorUnitario: 0 })}
          className="btn btn-outline w-full flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Adicionar Item
        </button>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Status *
        </label>
        <select
          className="input"
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
        <label className="block text-sm font-medium text-gray-700">
          Observações
        </label>
        <textarea
          className="input min-h-[100px]"
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
  );
}