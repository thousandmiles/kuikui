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
    const required = ['PORT', 'BACKEND_URL', 'FRONTEND_URL', 'CORS_ORIGIN'];
    const missing = required.filter(key => !env[key] && !env[`BACKEND_${key}`]);
    
    if (missing.length > 0) {
        console.log('Backend missing required variables:', missing.join(', '));
        return false;
    }
    
    console.log('Backend configuration valid');
    return true;
}

function validateFrontendConfig(env) {
    const requiredVite = ['VITE_API_BASE_URL', 'VITE_WEBSOCKET_URL', 'VITE_BACKEND_URL'];
    const missing = requiredVite.filter(key => !env[key]);
    
    if (missing.length > 0) {
        console.log('Frontend missing required VITE_ variables:', missing.join(', '));
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
    const mergedFrontendEnv = { ...frontendEnv };
    
    // Validate configurations
    const backendValid = validateBackendConfig(mergedBackendEnv);
    const frontendValid = validateFrontendConfig(mergedFrontendEnv);
    
    if (backendValid && frontendValid) {
        console.log('\nAll environment configurations are valid!');
        
        // Display configuration summary
        console.log('\nConfiguration Summary:');
        console.log(`   Backend Port: ${mergedBackendEnv.PORT || mergedBackendEnv.BACKEND_PORT || '3001'}`);
        console.log(`   Frontend Port: ${rootEnv.FRONTEND_PORT || '5173'}`);
        console.log(`   API Base URL: ${mergedFrontendEnv.VITE_API_BASE_URL}`);
        console.log(`   WebSocket URL: ${mergedFrontendEnv.VITE_WEBSOCKET_URL}`);
        console.log(`   CORS Origin: ${mergedBackendEnv.CORS_ORIGIN}`);
        
        process.exit(0);
    } else {
        console.log('\nEnvironment validation failed. Please fix the issues above.');
        process.exit(1);
    }
}

main();