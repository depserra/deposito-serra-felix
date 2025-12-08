import { Routes, Route, Navigate } from 'react-router-dom';
import VendasPage from './pages/vendas';
import ClientesPage from './pages/clientes';
import EstoquePage from './pages/estoque';
import ComprasPage from './pages/compras';
import FinanceiroPage from './pages/financeiro';
import RelatoriosPage from './pages/relatorios';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/vendas" replace />} />
      <Route path="/vendas" element={<VendasPage />} />
      <Route path="/clientes" element={<ClientesPage />} />
      <Route path="/estoque" element={<EstoquePage />} />
      <Route path="/compras" element={<ComprasPage />} />
      <Route path="/financeiro" element={<FinanceiroPage />} />
      <Route path="/relatorios" element={<RelatoriosPage />} />
    </Routes>
  );
}