import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AutoUpdate from './AutoUpdate.jsx';
import './styles.css';
import './phase1-visual-refinement.css';
import './nexus-player-profile.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><><App /><AutoUpdate /></></React.StrictMode>);