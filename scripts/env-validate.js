/**
 * Environment validation script for kuikui
 * Validates that all required environment variables are properly configured
 */

const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) {
        return {};
    }
    
    const env = {};
    const content = fs.readFileSync(filePath, 'utf8');
    
    content.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                env[key.trim()] = valueParts.join('=').trim();
            }
        }
    });
    
    return env;
}

function validateBackendConfig(env) {
    const required = ['BACKEND_PORT', 'BACKEND_HOST', 'BACKEND_URL', 'CORS_ORIGIN', 'API_BASE_URL', 'WEBSOCKET_URL'];
    const missing = required.filter(key => !env[key]);
    
    if (missing.length > 0) {
        console.log('Backend missing required variables:', missing.join(', '));
        return false;
    }
    
    console.log('Backend configuration valid');
    return true;
}

function validateFrontendConfig(env) {
    const required = ['FRONTEND_PORT', 'FRONTEND_HOST', 'FRONTEND_URL'];
    const missing = required.filter(key => !env[key]);
    
    if (missing.length > 0) {
        console.log('Frontend missing required ariables:', missing.join(', '));
        return false;
    }
    
    console.log('Frontend configuration valid');
    return true;
}

function main() {
    console.log('Validating environment configuration...\n');
    
    // Load environment files
    const rootEnv = loadEnv(path.join(__dirname, '..', '.env'));
    const backendEnv = loadEnv(path.join(__dirname, '..', 'backend', '.env'));
    const frontendEnv = loadEnv(path.join(__dirname, '..', 'frontend', '.env'));
    
    // Merge environments (backend inherits from root)
    const mergedBackendEnv = { ...rootEnv, ...backendEnv };
    const mergedFrontendEnv = { ...rootEnv, ...frontendEnv };
    
    // Validate configurations
    const backendValid = validateBackendConfig(mergedBackendEnv);
    const frontendValid = validateFrontendConfig(mergedFrontendEnv);
    
    if (backendValid && frontendValid) {
        console.log('\nAll environment configurations are good!');
        // Display configuration summary
        console.log(`- Backend Port: ${mergedBackendEnv.BACKEND_PORT || '3001'}`);
        console.log(`- Frontend Port: ${mergedFrontendEnv.FRONTEND_PORT || '5173'}`);
        console.log(`- Backend API Base URL: ${mergedBackendEnv.API_BASE_URL}`);
        console.log(`- Frontend Base URL: ${mergedFrontendEnv.FRONTEND_URL}`);
        console.log(`- WebSocket URL: ${mergedBackendEnv.WEBSOCKET_URL}`);
        
        process.exit(0);
    } else {
        console.log('\nEnvironment validation failed. Please fix the issues above.');
        process.exit(1);
    }
}

main();
