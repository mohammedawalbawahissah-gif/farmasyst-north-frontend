import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import AIFloatingWidget from '../ai/AIFloatingWidget';
import './AppLayout.css';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-layout__main">
        <div className="app-layout__content animate-fade-in">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
      {/* AI floating chat widget — visible across all portals */}
      <AIFloatingWidget />
    </div>
  );
}
