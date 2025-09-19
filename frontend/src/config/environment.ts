/**
 * Frontend environment configuration for kuikui
 */

export interface FrontendConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  API_BASE_URL: string;
  WEBSOCKET_URL: string;
  BACKEND_URL: string;
  FRONTEND_URL: string;
}

/**
 * Loads and validates frontend environment configuration
 */
export function loadFrontendConfig(): FrontendConfig {
  // Get environment variables from Vite
  const viteEnv = import.meta.env;

  const nodeEnv = viteEnv.MODE || 'development';

  // Default development URLs
  const defaultBackendUrl = 'http://localhost:3001';
  const defaultFrontendUrl = 'http://localhost:5173';

  const backendUrl = viteEnv.VITE_BACKEND_URL || defaultBackendUrl;
  const frontendUrl = viteEnv.VITE_FRONTEND_URL || defaultFrontendUrl;
  const apiBaseUrl = viteEnv.VITE_API_BASE_URL || `${backendUrl}/api`;
  const websocketUrl = viteEnv.VITE_WEBSOCKET_URL || backendUrl;

  return {
    NODE_ENV: nodeEnv as 'development' | 'production' | 'test',
    API_BASE_URL: apiBaseUrl,
    WEBSOCKET_URL: websocketUrl,
    BACKEND_URL: backendUrl,
    FRONTEND_URL: frontendUrl,
  };
}

// Export singleton instance
export const frontendConfig = loadFrontendConfig();
