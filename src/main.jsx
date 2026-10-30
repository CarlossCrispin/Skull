import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PageShell } from './components/page/PageShell.jsx';
import './styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <PageShell />
  </StrictMode>,
);
