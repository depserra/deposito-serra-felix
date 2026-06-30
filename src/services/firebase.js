import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// ─── Depósito Serra Félix ─────────────────────────────────────────────────────
const firebaseConfigDeposito = {
  apiKey: "AIzaSyCbH1440LSYJqZJSkkutT_o5q6u22lK2QY",
  authDomain: "deposito-serra-do-felix.firebaseapp.com",
  projectId: "deposito-serra-do-felix",
  storageBucket: "deposito-serra-do-felix.firebasestorage.app",
  messagingSenderId: "412648694325",
  appId: "1:412648694325:web:a3749d6e8274e84047477c",
  measurementId: "G-CY9DJBZG00"
};

// ─── Casa de Ração ────────────────────────────────────────────────────────────
const firebaseConfigRacao = {
  apiKey: "AIzaSyDcfcxAZ21z2wy9FRDv2YyyZ71Gp53hag0",
  authDomain: "casa-de-racao-2f709.firebaseapp.com",
  projectId: "casa-de-racao-2f709",
  storageBucket: "casa-de-racao-2f709.firebasestorage.app",
  messagingSenderId: "791716625966",
  appId: "1:791716625966:web:ac32b6f75d87df9a2a29bf"
};

// ─── Inicialização dos apps ───────────────────────────────────────────────────
const appDeposito = getApps().find(a => a.name === '[DEFAULT]')
  ?? initializeApp(firebaseConfigDeposito);

const appRacao = getApps().find(a => a.name === 'racao')
  ?? initializeApp(firebaseConfigRacao, 'racao');

// ─── Exports ──────────────────────────────────────────────────────────────────
// Auth fica no projeto principal (Depósito) — login compartilhado
export const auth = getAuth(appDeposito);
export const storage = getStorage(appDeposito);

// Um Firestore por sistema
export const dbDeposito = getFirestore(appDeposito);
export const dbRacao    = getFirestore(appRacao);

// Compatibilidade retroativa: exporta `db` como alias do Depósito
// (usado em arquivos que ainda não foram migrados para useSystem)
export const db = dbDeposito;