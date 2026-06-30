import { createContext, useContext, useState } from 'react';
import { dbDeposito, dbRacao } from '../services/firebase';

// Configuração de cada sistema
export const SYSTEMS = {
  deposito: {
    id: 'deposito',
    name: 'Depósito Serra Félix',
    logo: '/logo-serra-felix.png',
    logoAlt: 'Depósito Serra Félix - Material de Construção',
    db: dbDeposito,
  },
  racao: {
    id: 'racao',
    name: 'Casa de Ração',
    logo: '/logo-casa-racao.png',
    logoAlt: 'Casa de Ração',
    db: dbRacao,
  },
};

const SystemContext = createContext({});

export function SystemProvider({ children }) {
  const [activeSystem, setActiveSystemState] = useState(() => {
    const saved = sessionStorage.getItem('activeSystem');
    return saved && SYSTEMS[saved] ? SYSTEMS[saved] : null;
  });

  const selectSystem = (systemId) => {
    const system = SYSTEMS[systemId];
    if (system) {
      sessionStorage.setItem('activeSystem', systemId);
      setActiveSystemState(system);
    }
  };

  const clearSystem = () => {
    sessionStorage.removeItem('activeSystem');
    setActiveSystemState(null);
  };

  return (
    <SystemContext.Provider value={{ activeSystem, selectSystem, clearSystem }}>
      {children}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem deve ser usado dentro de um SystemProvider');
  }
  return context;
}
