import React from 'react';
import ReactDOM from 'react-dom/client';
import { WebApp } from './WebApp';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <WebApp />
    </React.StrictMode>
  );
}
