// Configuração do Firebase (substitua com suas credenciais)
import { initializeApp, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCMzQvw7qcxw6tB-P6y6HC5X6uH2ZW4-go",
  authDomain: "deposito-serra-felix.firebaseapp.com",
  projectId: "deposito-serra-felix",
  storageBucket: "deposito-serra-felix.firebasestorage.app",
  messagingSenderId: "536757368497",
  appId: "1:536757368497:web:a836ba88591bc3caf25490"
};

// Inicialização singleton do Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    // Se já estiver inicializado, usa a instância existente
    app = getApp();
  } else {
    throw error;
  }
}

// Inicialização dos serviços com cache
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Habilitar persistência offline (apenas no browser)
if (typeof window !== 'undefined') {
  import('firebase/firestore').then(({ enableNetwork, disableNetwork }) => {
    // Tentar habilitar cache persistente
    try {
      // O Firestore já tem cache automático habilitado por padrão
    } catch (err) {
      // Cache já estava habilitado ou erro silencioso
    }
  }).catch(err => {
    // Erro silencioso ao importar funcionalidades offline
  });
}