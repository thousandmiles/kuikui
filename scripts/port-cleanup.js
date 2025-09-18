/**
 * Port cleanup script for kuikui
 * Detects and kills processes occupying the development ports
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment configuration to get ports
function loadEnvConfig() {
    const envPath = path.join(__dirname, '..', '.env');
    const config = {
        BACKEND_PORT: 3001,
        FRONTEND_PORT: 5173
    };
    
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, value] = trimmed.split('=');
                if (key && value) {
                    config[key.trim()] = value.trim();
                }
            }
        });
    }
    
    return {
        backendPort: parseInt(config.BACKEND_PORT) || 3001,
        frontendPort: parseInt(config.FRONTEND_PORT) || 5173
    };
}

/**
 * Find process using a specific port
 */
function findProcessOnPort(port) {
    try {
        // Use lsof to find process on port
        const result = execSync(`lsof -ti:${port}`, { encoding: 'utf8', stdio: 'pipe' });
        const pids = result.trim().split('\n').filter(pid => pid);
        return pids.map(pid => parseInt(pid));
    } catch (error) {
        // No process found on port or lsof failed
        return [];
    }
}

/**
 * Kill process by PID
 */
function killProcess(pid, signal = 'TERM') {
    try {
        console.log(`Killing process ${pid} with SIG${signal}...`);
        execSync(`kill -${signal} ${pid}`, { stdio: 'pipe' });
        return true;
    } catch (error) {
        console.warn(`Failed to kill process ${pid}:`, error.message);
        return false;
    }
}

/**
 * Get process information
 */
function getProcessInfo(pid) {
    try {
        const result = execSync(`ps -p ${pid} -o pid,ppid,cmd --no-headers`, { encoding: 'utf8', stdio: 'pipe' });
        return result.trim();
    } catch (error) {
        return `PID ${pid} (process info unavailable)`;
    }
}

/**
 * Check what processes are using the ports without killing them
 */
function checkPorts(ports) {
    console.log('Checking development ports...\n');
    
    let foundProcesses = false;
    
    for (const port of ports) {
        const pids = findProcessOnPort(port);
        
        if (pids.length === 0) {
            console.log(`Port ${port}: Available`);
        } else {
            foundProcesses = true;
            console.log(`Port ${port}: In use by ${pids.length} process(es)`);
            
            for (const pid of pids) {
                const processInfo = getProcessInfo(pid);
                console.log(`${processInfo}`);
            }
        }
    }
    
    if (!foundProcesses) {
        console.log('\nAll development ports are available!');
    } else {
        console.log('\nRun "npm run port:cleanup" to clean up these processes.');
    }
}
/**
 * Clean up ports with user confirmation
 */
async function cleanupPorts(ports, options = {}) {
    const { force = false, timeout = 5000 } = options;
    
    console.log('Checking for processes on development ports...\n');
    
    for (const port of ports) {
        const pids = findProcessOnPort(port);
        
        if (pids.length === 0) {
            console.log(`Port ${port}: Available`);
            continue;
        }
        
        console.log(`Port ${port}: In use by ${pids.length} process(es)`);
        
        for (const pid of pids) {
            const processInfo = getProcessInfo(pid);
            console.log(`${processInfo}`);
        }
        
        if (force) {
            console.log(`Force killing processes on port ${port}...`);
            for (const pid of pids) {
                killProcess(pid, 'KILL');
            }
        } else {
            // Try graceful shutdown first
            console.log(`Gracefully stopping processes on port ${port}...`);
            for (const pid of pids) {
                killProcess(pid, 'TERM');
            }
            
            // Wait and check if processes are still running
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const remainingPids = findProcessOnPort(port);
            if (remainingPids.length > 0) {
                console.log(`Force killing remaining processes on port ${port}...`);
                for (const pid of remainingPids) {
                    killProcess(pid, 'KILL');
                }
            }
        }
        
        // Final check
        await new Promise(resolve => setTimeout(resolve, 1000));
        const finalCheck = findProcessOnPort(port);
        if (finalCheck.length === 0) {
            console.log(`Port ${port}: Cleaned up successfully`);
        } else {
            console.error(`Port ${port}: Failed to clean up (${finalCheck.length} processes still running)`);
        }
    }
    
    console.log('');
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const force = args.includes('--force') || args.includes('-f');
    const check = args.includes('--check') || args.includes('-c');
    const help = args.includes('--help') || args.includes('-h');
    
    if (help) {
        console.log(`
Port Cleanup Utility for kuikui

Usage:
  node scripts/port-cleanup.js [options]

Options:
  --check, -c    Just check what processes are using the ports
  --force, -f    Force kill processes without graceful shutdown
  --help, -h     Show this help message

Examples:
  node scripts/port-cleanup.js          # Graceful cleanup
  node scripts/port-cleanup.js --check  # Just check port usage
  node scripts/port-cleanup.js --force  # Force kill processes
`);
        return;
    }
    
    try {
        const config = loadEnvConfig();
        const ports = [config.backendPort, config.frontendPort];
        
        if (check) {
            checkPorts(ports);
            return;
        }
        
        console.log('kuikui Port Cleanup Utility');
        console.log(`arget ports: ${ports.join(', ')}\n`);
        
        await cleanupPorts(ports, { force });
        
        console.log('Port cleanup complete!');
        
    } catch (error) {
        console.error('Port cleanup failed:', error.message);
        process.exit(1);
    }
}

// Only run if called directly
if (require.main === module) {
    main();
}

module.exports = { cleanupPorts, findProcessOnPort, loadEnvConfig };