import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ui/ErrorBoundary';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/login';
import VendasPage from './pages/vendas';
import ClientesPage from './pages/clientes';
import EstoquePage from './pages/estoque';
import ComprasPage from './pages/compras';
import FinanceiroPage from './pages/financeiro';
import RelatoriosPage from './pages/relatorios';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/vendas" replace />} />
          <Route path="/vendas" element={<PrivateRoute><VendasPage /></PrivateRoute>} />
          <Route path="/clientes" element={<PrivateRoute><ClientesPage /></PrivateRoute>} />
          <Route path="/estoque" element={<PrivateRoute><EstoquePage /></PrivateRoute>} />
          <Route path="/compras" element={<PrivateRoute><ComprasPage /></PrivateRoute>} />
          <Route path="/financeiro" element={<PrivateRoute><FinanceiroPage /></PrivateRoute>} />
          <Route path="/relatorios" element={<PrivateRoute><RelatoriosPage /></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}