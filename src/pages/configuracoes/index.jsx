import { useState, useEffect } from 'react';
import PageLayout from '../../components/layout-new/PageLayout';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { 
  Building2, 
  Settings, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Database,
  Save,
  RotateCcw,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Moon,
  Sun,
  Bell,
  Clock
} from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingComponents';

export default function ConfiguracoesPage() {
  const {
    configuracoes,
    loading,
    error,
    salvarConfiguracoes,
    atualizarConfiguracao,
    fazerBackup,
    exportarDados,
    resetarConfiguracoes
  } = useConfiguracoes();

  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState('empresa');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    if (configuracoes && Object.keys(configuracoes).length > 0) {
      setFormData(configuracoes);
    }
  }, [configuracoes]);

  const handleChange = (secao, campo, valor) => {
    setFormData(prev => ({
      ...prev,
      [secao]: {
        ...prev[secao],
        [campo]: valor
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      await salvarConfiguracoes(formData);
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao salvar configurações: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      setBackupLoading(true);
      setMessage({ type: '', text: '' });
      const resultado = await fazerBackup();
      setMessage({ 
        type: 'success', 
        text: `Backup realizado com sucesso! ${resultado.registros} registros salvos.` 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao fazer backup: ' + err.message });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setMessage({ type: '', text: '' });
      await exportarDados();
      setMessage({ type: 'success', text: 'Dados exportados com sucesso!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao exportar dados: ' + err.message });
    }
  };

  const handleReset = async () => {
    if (window.confirm('Tem certeza que deseja resetar todas as configurações para os valores padrão?')) {
      try {
        setSaving(true);
        await resetarConfiguracoes();
        setMessage({ type: 'success', text: 'Configurações resetadas com sucesso!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } catch (err) {
        setMessage({ type: 'error', text: 'Erro ao resetar configurações: ' + err.message });
      } finally {
        setSaving(false);
      }
    }
  };

  const tabs = [
    { id: 'empresa', label: 'Empresa', icon: Building2 },
    { id: 'sistema', label: 'Sistema', icon: Settings },
    { id: 'vendas', label: 'Vendas', icon: ShoppingCart },
    { id: 'estoque', label: 'Estoque', icon: Package },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'backup', label: 'Backup', icon: Database }
  ];

  if (loading && !formData.empresa) {
    return (
      <PageLayout title="Configurações">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner text="Carregando configurações..." />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Configurações">
      <div className="space-y-6">
        {/* Header com mensagens */}
        <div className="mb-6">
          <p className="text-slate-600 dark:text-slate-400">
            Gerencie as configurações do sistema
          </p>
          
          {message.text && (
            <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
            }`}>
              {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span>{message.text}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
            <div className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/10'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conteúdo das tabs */}
          <div className="p-6">
            {/* Tab Empresa */}
            {activeTab === 'empresa' && formData.empresa && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Informações da Empresa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Nome da Empresa
                    </label>
                    <input
                      type="text"
                      value={formData.empresa.nome || ''}
                      onChange={(e) => handleChange('empresa', 'nome', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      CNPJ
                    </label>
                    <input
                      type="text"
                      value={formData.empresa.cnpj || ''}
                      onChange={(e) => handleChange('empresa', 'cnpj', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Endereço
                    </label>
                    <input
                      type="text"
                      value={formData.empresa.endereco || ''}
                      onChange={(e) => handleChange('empresa', 'endereco', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={formData.empresa.telefone || ''}
                      onChange={(e) => handleChange('empresa', 'telefone', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={formData.empresa.email || ''}
                      onChange={(e) => handleChange('empresa', 'email', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Site
                    </label>
                    <input
                      type="text"
                      value={formData.empresa.site || ''}
                      onChange={(e) => handleChange('empresa', 'site', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab Sistema */}
            {activeTab === 'sistema' && formData.sistema && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Configurações do Sistema
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Moeda
                    </label>
                    <select
                      value={formData.sistema.moeda || 'BRL'}
                      onChange={(e) => handleChange('sistema', 'moeda', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="BRL">Real (BRL)</option>
                      <option value="USD">Dólar (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Idioma
                    </label>
                    <select
                      value={formData.sistema.idioma || 'pt-BR'}
                      onChange={(e) => handleChange('sistema', 'idioma', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es-ES">Español</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Manter Histórico (dias)
                    </label>
                    <input
                      type="number"
                      value={formData.sistema.manterHistorico || 365}
                      onChange={(e) => handleChange('sistema', 'manterHistorico', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sistema.notificacoes || false}
                        onChange={(e) => handleChange('sistema', 'notificacoes', e.target.checked)}
                        className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Bell size={16} />
                        Habilitar Notificações
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sistema.backupAutomatico || false}
                        onChange={(e) => handleChange('sistema', 'backupAutomatico', e.target.checked)}
                        className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Database size={16} />
                        Backup Automático
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Vendas */}
            {activeTab === 'vendas' && formData.vendas && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Configurações de Vendas
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <input
                      type="checkbox"
                      checked={formData.vendas.gerarCodigoAutomatico || false}
                      onChange={(e) => handleChange('vendas', 'gerarCodigoAutomatico', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Gerar Código Automático
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Gera códigos sequenciais automaticamente para novas vendas
                      </span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <input
                      type="checkbox"
                      checked={formData.vendas.exigirCliente || false}
                      onChange={(e) => handleChange('vendas', 'exigirCliente', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Exigir Cliente
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Obriga informar o cliente ao registrar uma venda
                      </span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <input
                      type="checkbox"
                      checked={formData.vendas.permitirVendaSemEstoque || false}
                      onChange={(e) => handleChange('vendas', 'permitirVendaSemEstoque', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Permitir Venda Sem Estoque
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Permite vender produtos mesmo sem saldo em estoque
                      </span>
                    </div>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Descrição Padrão
                    </label>
                    <textarea
                      value={formData.vendas.descricaoPadrao || ''}
                      onChange={(e) => handleChange('vendas', 'descricaoPadrao', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Descrição padrão para vendas..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab Estoque */}
            {activeTab === 'estoque' && formData.estoque && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Configurações de Estoque
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <input
                      type="checkbox"
                      checked={formData.estoque.alertaEstoqueBaixo || false}
                      onChange={(e) => handleChange('estoque', 'alertaEstoqueBaixo', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Alerta de Estoque Baixo
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Exibe alertas quando produtos atingirem o estoque mínimo
                      </span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <input
                      type="checkbox"
                      checked={formData.estoque.controlarLotes || false}
                      onChange={(e) => handleChange('estoque', 'controlarLotes', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Controlar Lotes
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Ativa o controle de lotes e datas de validade
                      </span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <input
                      type="checkbox"
                      checked={formData.estoque.custeioMedio || false}
                      onChange={(e) => handleChange('estoque', 'custeioMedio', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Custeio Médio
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Calcula o custo médio dos produtos automaticamente
                      </span>
                    </div>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Dias de Aviso de Vencimento
                    </label>
                    <input
                      type="number"
                      value={formData.estoque.diasAvisoVencimento || 30}
                      onChange={(e) => handleChange('estoque', 'diasAvisoVencimento', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="30"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Alertar com quantos dias de antecedência do vencimento
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Financeiro */}
            {activeTab === 'financeiro' && formData.financeiro && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Configurações Financeiras
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Conta Caixa Padrão
                    </label>
                    <input
                      type="text"
                      value={formData.financeiro.contaCaixaPadrao || ''}
                      onChange={(e) => handleChange('financeiro', 'contaCaixaPadrao', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Dias Vencimento Padrão
                    </label>
                    <input
                      type="number"
                      value={formData.financeiro.diasVencimentoPadrao || 30}
                      onChange={(e) => handleChange('financeiro', 'diasVencimentoPadrao', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Juros de Mora (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.financeiro.jurosMora || 0}
                      onChange={(e) => handleChange('financeiro', 'jurosMora', parseFloat(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Multa de Atraso (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.financeiro.multaAtraso || 0}
                      onChange={(e) => handleChange('financeiro', 'multaAtraso', parseFloat(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab Backup */}
            {activeTab === 'backup' && formData.backup && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Backup e Exportação de Dados
                </h3>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">Importante sobre Backups</p>
                      <p>
                        Os backups são salvos no Firebase e podem ser recuperados a qualquer momento. 
                        Recomendamos também fazer exportações locais periodicamente.
                      </p>
                    </div>
                  </div>
                </div>

                {formData.backup.ultimoBackup && (
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Clock size={18} />
                      <span className="text-sm">
                        Último backup: {new Date(formData.backup.ultimoBackup.seconds ? formData.backup.ultimoBackup.toDate() : formData.backup.ultimoBackup).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Frequência de Backup
                    </label>
                    <select
                      value={formData.backup.frequenciaBackup || 'semanal'}
                      onChange={(e) => handleChange('backup', 'frequenciaBackup', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="diario">Diário</option>
                      <option value="semanal">Semanal</option>
                      <option value="mensal">Mensal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Manter Backups
                    </label>
                    <input
                      type="number"
                      value={formData.backup.manterBackups || 10}
                      onChange={(e) => handleChange('backup', 'manterBackups', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  <button
                    onClick={handleBackup}
                    disabled={backupLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {backupLoading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Criando Backup...
                      </>
                    ) : (
                      <>
                        <Database size={18} />
                        Criar Backup Agora
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <Download size={18} />
                    Exportar Dados (JSON)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer com botões de ação */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-900 flex flex-wrap gap-3 justify-end">
            <button
              onClick={handleReset}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw size={18} />
              Resetar Padrões
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salvar Configurações
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}