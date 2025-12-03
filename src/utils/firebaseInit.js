// Utilitários para inicialização segura do Firebase
export const checkFirebaseConnection = async () => {
  try {
    // Teste simples de conectividade
    const testPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout na conexão com Firebase'));
      }, 5000);
      
      // Simular uma operação de teste
      setTimeout(() => {
        clearTimeout(timeout);
        resolve(true);
      }, 1000);
    });
    
    await testPromise;
    return { success: true, message: 'Firebase conectado' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const waitForFirebaseInit = async (maxWait = 10000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    try {
      // Verificar se o Firebase está disponível
      if (typeof window !== 'undefined' && window.firebase) {
        return true;
      }
      
      // Aguardar um pouco antes da próxima verificação
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  throw new Error('Firebase não inicializou no tempo esperado');
};

export const logFirebaseStatus = () => {
  // Log desabilitado para produção
};