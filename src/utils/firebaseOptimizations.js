import { 
  enableNetwork, 
  disableNetwork,
  enableIndexedDbPersistence,
  clearIndexedDbPersistence
} from 'firebase/firestore';
import { db } from '../services/firebase';

// ============ CACHE E PERSISTÊNCIA OFFLINE ============

// Habilitar persistência offline
export async function habilitarPersistenciaOffline() {
  try {
    await enableIndexedDbPersistence(db);
    console.log('Persistência offline habilitada');
    return true;
  } catch (err) {
    console.warn('Falha ao habilitar persistência offline:', err);
    if (err.code === 'failed-precondition') {
      console.warn('Múltiplas abas abertas, persistência offline não disponível');
    } else if (err.code === 'unimplemented') {
      console.warn('Navegador não suporta persistência offline');
    }
    return false;
  }
}

// Limpar cache offline
export async function limparCacheOffline() {
  try {
    await clearIndexedDbPersistence(db);
    console.log('Cache offline limpo');
    return true;
  } catch (err) {
    console.error('Erro ao limpar cache offline:', err);
    return false;
  }
}

// Habilitar/desabilitar sincronização em tempo real
export async function controlarSincronizacao(habilitar = true) {
  try {
    if (habilitar) {
      await enableNetwork(db);
      console.log('Sincronização online habilitada');
    } else {
      await disableNetwork(db);
      console.log('Modo offline ativado');
    }
    return true;
  } catch (err) {
    console.error('Erro no controle de sincronização:', err);
    return false;
  }
}

// ============ OTIMIZAÇÕES DE CONSULTA ============

// Função para paginar resultados grandes
export function criarPaginacao(collection, pageSize = 10) {
  let lastDocument = null;
  let isLoading = false;
  
  return {
    async proximaPagina(queryConstraints = []) {
      if (isLoading) return null;
      
      try {
        isLoading = true;
        
        let query = collection;
        queryConstraints.forEach(constraint => {
          query = query.where(...constraint);
        });
        
        if (lastDocument) {
          query = query.startAfter(lastDocument);
        }
        
        query = query.limit(pageSize);
        
        const snapshot = await query.get();
        const docs = snapshot.docs;
        
        if (docs.length > 0) {
          lastDocument = docs[docs.length - 1];
        }
        
        return docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (err) {
        console.error('Erro na paginação:', err);
        throw err;
      } finally {
        isLoading = false;
      }
    },
    
    reset() {
      lastDocument = null;
    },
    
    get hasMore() {
      return lastDocument !== null;
    }
  };
}

// ============ MONITORAMENTO DE PERFORMANCE ============

// Classe para monitorar performance das operações
export class PerformanceMonitor {
  constructor() {
    this.metricas = new Map();
  }
  
  iniciarMedicao(operacao) {
    const inicio = performance.now();
    return {
      finalizar: () => {
        const duracao = performance.now() - inicio;
        this.registrarMetrica(operacao, duracao);
        return duracao;
      }
    };
  }
  
  registrarMetrica(operacao, duracao) {
    if (!this.metricas.has(operacao)) {
      this.metricas.set(operacao, []);
    }
    
    const historico = this.metricas.get(operacao);
    historico.push({
      duracao,
      timestamp: new Date()
    });
    
    // Manter apenas os últimos 100 registros
    if (historico.length > 100) {
      historico.shift();
    }
    
    console.log(`[Performance] ${operacao}: ${duracao.toFixed(2)}ms`);
  }
  
  obterEstatisticas(operacao) {
    const historico = this.metricas.get(operacao) || [];
    if (historico.length === 0) return null;
    
    const duracoes = historico.map(m => m.duracao);
    const soma = duracoes.reduce((acc, d) => acc + d, 0);
    const media = soma / duracoes.length;
    const min = Math.min(...duracoes);
    const max = Math.max(...duracoes);
    
    return {
      operacao,
      totalExecucoes: historico.length,
      tempoMedio: media,
      tempoMinimo: min,
      tempoMaximo: max,
      ultimaExecucao: historico[historico.length - 1].timestamp
    };
  }
  
  obterResumoGeral() {
    const resumo = {};
    for (const [operacao] of this.metricas) {
      resumo[operacao] = this.obterEstatisticas(operacao);
    }
    return resumo;
  }
}

// Instância global do monitor
export const monitor = new PerformanceMonitor();

// ============ UTILITÁRIOS DE REDE ============

// Detectar status de conexão
export class StatusConexao {
  constructor() {
    this.callbacks = new Set();
    this.online = navigator.onLine;
    
    window.addEventListener('online', () => {
      this.online = true;
      this.notificarCallbacks();
    });
    
    window.addEventListener('offline', () => {
      this.online = false;
      this.notificarCallbacks();
    });
  }
  
  get isOnline() {
    return this.online;
  }
  
  onStatusChange(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }
  
  notificarCallbacks() {
    this.callbacks.forEach(callback => {
      try {
        callback(this.online);
      } catch (err) {
        console.error('Erro no callback de status de conexão:', err);
      }
    });
  }
}

export const statusConexao = new StatusConexao();

// ============ RETRY COM BACKOFF ============

// Função para retry automático com backoff exponencial
export async function retryComBackoff(
  operacao, 
  maxTentativas = 3, 
  delayInicial = 1000,
  multiplicador = 2
) {
  let ultimoErro;
  
  for (let tentativa = 0; tentativa < maxTentativas; tentativa++) {
    try {
      return await operacao();
    } catch (err) {
      ultimoErro = err;
      
      // Se é a última tentativa, não espera
      if (tentativa === maxTentativas - 1) {
        break;
      }
      
      // Calcular delay com backoff exponencial
      const delay = delayInicial * Math.pow(multiplicador, tentativa);
      console.log(`Tentativa ${tentativa + 1} falhou, tentando novamente em ${delay}ms`);
      
      // Esperar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw ultimoErro;
}

// ============ BATCHING DE OPERAÇÕES ============

// Classe para agrupar operações em lotes
export class BatchProcessor {
  constructor(processFunction, batchSize = 10, delay = 1000) {
    this.processFunction = processFunction;
    this.batchSize = batchSize;
    this.delay = delay;
    this.queue = [];
    this.timeoutId = null;
  }
  
  add(item) {
    this.queue.push(item);
    
    // Se atingiu o tamanho do lote, processa imediatamente
    if (this.queue.length >= this.batchSize) {
      this.processBatch();
    } else {
      // Senão, agenda processamento
      this.scheduleProcessing();
    }
  }
  
  scheduleProcessing() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this.timeoutId = setTimeout(() => {
      this.processBatch();
    }, this.delay);
  }
  
  async processBatch() {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, this.batchSize);
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    try {
      await this.processFunction(batch);
    } catch (err) {
      console.error('Erro no processamento em lote:', err);
      // Recolocar itens na fila em caso de erro
      this.queue.unshift(...batch);
    }
  }
  
  async flush() {
    while (this.queue.length > 0) {
      await this.processBatch();
    }
  }
}

// ============ INICIALIZAÇÃO ============

// Função para inicializar otimizações
export async function inicializarOtimizacoes() {
  console.log('Inicializando otimizações do Firebase...');
  
  // Habilitar persistência offline
  const persistenciaHabilitada = await habilitarPersistenciaOffline();
  
  // Monitorar status de conexão
  statusConexao.onStatusChange((online) => {
    console.log(`Status de conexão: ${online ? 'Online' : 'Offline'}`);
    
    // Tentar reabilitar sincronização quando voltar online
    if (online) {
      controlarSincronizacao(true);
    }
  });
  
  return {
    persistenciaOffline: persistenciaHabilitada,
    monitorPerformance: monitor,
    statusConexao: statusConexao
  };
}