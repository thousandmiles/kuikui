/**
 * Backend environment configuration for kuikui
 */

export interface BackendConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  BACKEND_URL: string;
  FRONTEND_URL: string;
  CORS_ORIGIN: string;
  ROOM_EXPIRY_HOURS: number;
}

/**
 * Loads and validates backend environment configuration
 */
export function loadBackendConfig(): BackendConfig {
  const env = process.env;

  const nodeEnv = env.NODE_ENV || 'development';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV: ${nodeEnv}. Must be development, production, or test.`
    );
  }

  const port = parseInt(env.PORT || env.BACKEND_PORT || '3001', 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: ${env.PORT}. Must be a valid port number.`);
  }

  const roomExpiryHours = parseInt(env.ROOM_EXPIRY_HOURS || '24', 10);
  if (isNaN(roomExpiryHours) || roomExpiryHours <= 0) {
    throw new Error(
      `Invalid ROOM_EXPIRY_HOURS: ${env.ROOM_EXPIRY_HOURS}. Must be a positive number.`
    );
  }

  const backendHost = env.BACKEND_HOST || 'localhost';
  const frontendHost = env.FRONTEND_HOST || 'localhost';
  const frontendPort = env.FRONTEND_PORT || '5173';

  const backendUrl = env.BACKEND_URL || `http://${backendHost}:${port}`;
  const frontendUrl =
    env.FRONTEND_URL || `http://${frontendHost}:${frontendPort}`;
  const corsOrigin = env.CORS_ORIGIN || frontendUrl;

  return {
    NODE_ENV: nodeEnv as 'development' | 'production' | 'test',
    PORT: port,
    BACKEND_URL: backendUrl,
    FRONTEND_URL: frontendUrl,
    CORS_ORIGIN: corsOrigin,
    ROOM_EXPIRY_HOURS: roomExpiryHours,
  };
}

// Export singleton instance
export const backendConfig = loadBackendConfig();
