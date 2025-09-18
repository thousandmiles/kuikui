import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
    // Load env file from root directory (parent of frontend)
    const env = loadEnv(mode, path.resolve(__dirname, '..'), '')

    return {
        plugins: [react()],
        server: {
            port: parseInt(env.FRONTEND_PORT) || 5173,
            host: true
        },
        preview: {
            port: parseInt(env.FRONTEND_PORT) || 4173,
            host: true
        },
        // Define environment variables for the frontend
        define: {
            'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.API_BASE_URL),
            'import.meta.env.VITE_WEBSOCKET_URL': JSON.stringify(env.WEBSOCKET_URL),
            'import.meta.env.VITE_BACKEND_URL': JSON.stringify(env.BACKEND_URL),
            'import.meta.env.VITE_FRONTEND_URL': JSON.stringify(env.FRONTEND_URL),
        },
        // Load .env from parent directory
        envDir: '../',
        // Allow access to environment variables without VITE_ prefix by loading from root
        envPrefix: ['VITE_', 'API_', 'WEBSOCKET_', 'BACKEND_', 'FRONTEND_']
    }
})