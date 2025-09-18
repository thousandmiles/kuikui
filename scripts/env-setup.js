/**
 * Environment setup script for kuikui
 * Ensures .env files are properly configured before starting the application
 */

const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

function ensureEnvFile(dir, templateFile, targetFile) {
    const templatePath = path.join(dir, templateFile);
    const targetPath = path.join(dir, targetFile);
    
    if (!fs.existsSync(targetPath) && fs.existsSync(templatePath)) {
        console.log(`Creating ${targetFile} from ${templateFile} in ${dir}`);
        fs.copyFileSync(templatePath, targetPath);
        return true;
    }
    return false;
}

function main() {
    console.log('Setting up environment configuration...\n');
    
    // Ensure root .env exists
    const created = [];
    
    if (ensureEnvFile(rootDir, '.env.example', '.env')) {
        created.push('Root .env');
    }
    
    // Ensure backend .env exists
    if (ensureEnvFile(backendDir, '.env.example', '.env')) {
        created.push('Backend .env');
    }
    
    // Ensure frontend .env exists (if example exists)
    if (fs.existsSync(path.join(frontendDir, '.env.example'))) {
        if (ensureEnvFile(frontendDir, '.env.example', '.env')) {
            created.push('Frontend .env');
        }
    }
    
    if (created.length > 0) {
        console.log('Created environment files:');
        created.forEach(file => console.log(`   - ${file}`));
        console.log('\nPlease review and update the environment variables as needed.\n');
    } else {
        console.log('All environment files already exist.\n');
    }
    
    console.log('Environment setup complete!');
}

main();