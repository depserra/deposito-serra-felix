import { useState, useEffect } from 'react';
import { 
  collection, 
  doc,
  getDoc,
  setDoc, 
  updateDoc, 
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';

export function useConfiguracoes() {
  const [configuracoes, setConfiguracoes] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============ CONFIGURAÇÕES GERAIS ============

  // Função para buscar configurações
  async function buscarConfiguracoes() {
    try {
      setLoading(true);
      setError(null);

      const configDoc = await getDoc(doc(db, 'configuracoes', 'geral'));
      
      if (configDoc.exists()) {
        const dadosConfig = configDoc.data();
        setConfiguracoes(dadosConfig);
        return dadosConfig;
      } else {
        // Criar configurações padrão se não existirem
        const configPadrao = {
          empresa: {
            nome: 'Serra do Félix',
            cnpj: '',
            endereco: '',
            telefone: '',
            email: '',
            site: ''
          },
          sistema: {
            moeda: 'BRL',
            idioma: 'pt-BR',
            tema: 'light',
            notificacoes: true,
            backupAutomatico: true,
            manterHistorico: 365 // dias
          },
          vendas: {
            gerarCodigoAutomatico: true,
            exigirCliente: false,
            permitirVendaSemEstoque: false,
            descricaoPadrao: ''
          },
          estoque: {
            alertaEstoqueBaixo: true,
            diasAvisoVencimento: 30,
            controlarLotes: false,
            custeioMedio: true
          },
          financeiro: {
            contaCaixaPadrao: 'Caixa Principal',
            diasVencimentoPadrao: 30,
            jurosMora: 2.0,
            multaAtraso: 0.5
          },
          backup: {
            ultimoBackup: null,
            frequenciaBackup: 'semanal', // diario, semanal, mensal
            manterBackups: 10
          },
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp()
        };
        
        await setDoc(doc(db, 'configuracoes', 'geral'), configPadrao);
        setConfiguracoes(configPadrao);
        return configPadrao;
      }
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para salvar configurações
  async function salvarConfiguracoes(novasConfiguracoes) {
    try {
      setLoading(true);
      setError(null);

      const configData = {
        ...novasConfiguracoes,
        atualizadoEm: serverTimestamp()
      };

      await setDoc(doc(db, 'configuracoes', 'geral'), configData, { merge: true });
      setConfiguracoes(prev => ({ ...prev, ...configData }));
      
      return configData;
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para atualizar configuração específica
  async function atualizarConfiguracao(secao, campo, valor) {
    try {
      setLoading(true);
      
      const caminho = `${secao}.${campo}`;
      const updateData = {
        [caminho]: valor,
        atualizadoEm: serverTimestamp()
      };

      await updateDoc(doc(db, 'configuracoes', 'geral'), updateData);
      
      setConfiguracoes(prev => ({
        ...prev,
        [secao]: {
          ...prev[secao],
          [campo]: valor
        }
      }));

      return true;
    } catch (err) {
      console.error('Erro ao atualizar configuração:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ============ BACKUP E RESTORE ============

  // Função para fazer backup completo
  async function fazerBackup() {
    try {
      setLoading(true);
      setError(null);

      const agora = new Date();
      const timestamp = agora.toISOString().slice(0, 19).replace(/[:-]/g, '');
      
      // Buscar todas as coleções
      const colecoes = ['clientes', 'vendas', 'produtos', 'categorias', 'contasReceber', 'contasPagar', 'fluxoCaixa'];
      const dadosBackup = {
        timestamp: agora,
        versao: '1.0',
        dados: {}
      };

      // Buscar dados de cada coleção
      for (const nomeColecao of colecoes) {
        try {
          const snapshot = await getDocs(collection(db, nomeColecao));
          dadosBackup.dados[nomeColecao] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (err) {
          console.warn(`Erro ao fazer backup da coleção ${nomeColecao}:`, err);
          dadosBackup.dados[nomeColecao] = [];
        }
      }

      // Salvar backup no Firebase
      const backupRef = doc(collection(db, 'backups'), `backup_${timestamp}`);
      await setDoc(backupRef, dadosBackup);

      // Atualizar data do último backup
      await atualizarConfiguracao('backup', 'ultimoBackup', agora);

      return {
        id: `backup_${timestamp}`,
        timestamp: agora,
        registros: Object.values(dadosBackup.dados).reduce((acc, colecao) => acc + colecao.length, 0)
      };
    } catch (err) {
      console.error('Erro ao fazer backup:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para listar backups disponíveis
  async function listarBackups() {
    try {
      setLoading(true);
      setError(null);

      const backupsQuery = query(
        collection(db, 'backups'),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(backupsQuery);
      const backups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return backups;
    } catch (err) {
      console.error('Erro ao listar backups:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ============ UTILITÁRIOS ============

  // Função para resetar configurações para padrão
  async function resetarConfiguracoes() {
    try {
      setLoading(true);
      
      // Deletar configurações atuais e recriar
      await buscarConfiguracoes(); // Isso criará as configurações padrão
      
      return true;
    } catch (err) {
      console.error('Erro ao resetar configurações:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para exportar dados (para download local)
  async function exportarDados(formato = 'json') {
    try {
      setLoading(true);
      setError(null);

      const colecoes = ['clientes', 'vendas', 'produtos', 'categorias'];
      const dadosExport = {};

      // Buscar dados de cada coleção
      for (const nomeColecao of colecoes) {
        try {
          const snapshot = await getDocs(collection(db, nomeColecao));
          dadosExport[nomeColecao] = snapshot.docs.map(doc => {
            const data = doc.data();
            // Converter timestamps para strings para JSON
            Object.keys(data).forEach(key => {
              if (data[key] && typeof data[key].toDate === 'function') {
                data[key] = data[key].toDate().toISOString();
              }
            });
            return { id: doc.id, ...data };
          });
        } catch (err) {
          console.warn(`Erro ao exportar ${nomeColecao}:`, err);
          dadosExport[nomeColecao] = [];
        }
      }

      // Preparar dados para download
      const exportData = {
        dataExportacao: new Date().toISOString(),
        sistema: 'Depósito Serra do Felix',
        versao: '1.0',
        ...dadosExport
      };

      if (formato === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_deposito_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }

      return exportData;
    } catch (err) {
      console.error('Erro ao exportar dados:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Carregar configurações automaticamente
  useEffect(() => {
    buscarConfiguracoes();
  }, []);

  return {
    // Estados
    configuracoes,
    loading,
    error,

    // Configurações
    buscarConfiguracoes,
    salvarConfiguracoes,
    atualizarConfiguracao,
    resetarConfiguracoes,

    // Backup e Restore
    fazerBackup,
    listarBackups,
    exportarDados
  };
}