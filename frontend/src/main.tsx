import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { frontendConfig } from './config/environment';
import logger from './utils/logger';

// Log environment configuration for debugging
logger.info('Frontend starting with configuration:');
logger.info(`NODE_ENV: ${frontendConfig.NODE_ENV}`);
logger.info(`API_BASE_URL: ${frontendConfig.API_BASE_URL}`);
logger.info(`WEBSOCKET_URL: ${frontendConfig.WEBSOCKET_URL}`);
logger.info(`BACKEND_URL: ${frontendConfig.BACKEND_URL}`);
logger.info(`FRONTEND_URL: ${frontendConfig.FRONTEND_URL}`);
logger.info('');

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
