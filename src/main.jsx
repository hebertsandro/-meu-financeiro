import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './salary-reports.css';
import './phase1-visual-refinement.css';
import './redesign-2026.css';
import './nexus-player-profile.css';
import './nexus-motion.css';
import './nexus-brand.css';
import './nexus-futuristic.css';
import './nexus-games-futuristic.css';
import './nexus-space-fx.css';
import './nexus-space-neon.css';
import './nexus-space-ships.css';
import './nexus-library-polish.css';
import './nexus-arcade-polish.css';
import './nexus-perf.css';
import './nexus-frames.css';
import './nexus-games-v2.css';
import './nexus-v2.css';

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  try {
    if (sessionStorage.getItem('mf_chunk_reload') !== '1') { sessionStorage.setItem('mf_chunk_reload', '1'); window.location.reload(); }
  } catch { window.location.reload(); }
});

class AppStartupBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, details: '' };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    const details = [error?.stack || '', info?.componentStack || ''].filter(Boolean).join('\n\nCOMPONENTES:\n');
    this.setState({ details });
    console.error('Erro ao iniciar Meu Financeiro:', error, info);
  }
  render() {
    if (this.state.error) {
      const message = String(this.state.error?.message || this.state.error || 'Erro desconhecido');
      return (
        <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, boxSizing: 'border-box', background: '#080d18', color: '#f7f8ff', fontFamily: 'system-ui,sans-serif' }}>
          <section style={{ width: 'min(100%,420px)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'end', gap: 7, height: 54, marginBottom: 24 }}>
              <i style={{ width: 12, height: 17, borderRadius: 4, background: '#a78bfa' }} />
              <i style={{ width: 12, height: 31, borderRadius: 4, background: '#9275ff' }} />
              <i style={{ width: 12, height: 47, borderRadius: 4, background: '#55d9ea' }} />
            </div>
            <h1 style={{ fontSize: 23, margin: '0 0 10px' }}>Não foi possível abrir o aplicativo</h1>
            <p style={{ color: '#aab6ce', lineHeight: 1.5 }}>Ocorreu um erro durante a inicialização. A mensagem abaixo vai ajudar a corrigir o problema.</p>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', textAlign: 'left', maxHeight: '32dvh', overflowY: 'auto', padding: 14, borderRadius: 12, background: '#111a2b', color: '#ffb4b4', fontSize: 12 }}>{message}{this.state.details ? '\n\n' + this.state.details : ''}</pre>
            <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 12, border: 0, borderRadius: 10, padding: '13px 20px', background: 'linear-gradient(100deg,#9275ff,#55d9ea)', color: '#080d18', fontWeight: 800 }}>Tentar novamente</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <AppStartupBoundary>
        <App />
      </AppStartupBoundary>
    </React.StrictMode>
  );
}
