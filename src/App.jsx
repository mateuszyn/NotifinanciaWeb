import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Dashboard from './pages/Dashboard';
const Home = React.lazy(() => import('./pages/Home'));
import Termos from './pages/Termos';
import Privacidade from './pages/Privacidade';
import Contato from './pages/Contato';
import Footer from './components/Footer';
import LoginModal from './components/LoginModal';

function RadarRoute() {
  const navigate = useNavigate();

  return (
    <Suspense fallback={<div className="container py-5 text-center text-secondary">Carregando Radar...</div>}>
      <Home
        onSelectAsset={ticker => navigate('/', { state: { ticker } })}
        onOpenAI={() => navigate('/#portfolio-prompt')}
      />
    </Suspense>
  );
}

// O App.jsx é o esqueleto principal. 
// Ele engloba tudo com o AuthProvider (para liberar o login global)
// e o Router (para gerenciar as URLs).
export default function App() {
  
  // Efeito Global para fechar popovers nativos (<details>) ao clicar fora
  React.useEffect(() => {
    const closeDetailsOnClickOutside = (e) => {
      document.querySelectorAll('details[open]').forEach((details) => {
        if (details.classList.contains('asset-dividends-details')) return;
        if (!details.contains(e.target)) {
          details.removeAttribute('open');
        }
      });
    };

    document.addEventListener('click', closeDetailsOnClickOutside);
    return () => document.removeEventListener('click', closeDetailsOnClickOutside);
  }, []);

  return (
    <AuthProvider>
      <Router>
        {/* O flex-grow-1 empurra o Footer sempre pro fundo */}
        <div className="flex-grow-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/radar" element={<RadarRoute />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/contato" element={<Contato />} />
          </Routes>
        </div>
        <Footer />
      </Router>
      <LoginModal />
    </AuthProvider>
  );
}
