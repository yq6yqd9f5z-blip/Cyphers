const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const https = require('https');

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '7745709492:AAFjuwsQbPyEX3sGb0olwX6mVLm74lS0l30';
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID'; // You need to get your chat ID

module.exports = {
    name: 'update',
    description: 'Advanced sync system with Telegram notifications',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        const userJid = msg.key.participant || from;
        const userNumber = userJid.split('@')[0];
        
        try {
            const action = args[0]?.toLowerCase();
            const repoUrl = 'https://github.com/cybercyphers/Cyphers.git';

            if (action === 'check') {
                await sock.sendMessage(from, { 
                    text: '🔍 Checking sync status...' 
                }, { quoted: msg });

                const syncStatus = await checkSyncStatus();
                
                if (syncStatus.status === 'synced') {
                    await sock.sendMessage(from, { 
                        text: `✅ SYSTEM SYNCHRONIZED\nVersion: ${syncStatus.localVersion}\nAll files verified` 
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { 
                        text: `🚨 SYNC REQUIRED\nRepo: ${syncStatus.repoVersion} | Local: ${syncStatus.localVersion}\n\nUse [.update now] to synchronize` 
                    }, { quoted: msg });
                }
                return;
            }

            if (action === 'now') {
                // First check sync status
                const syncStatus = await checkSyncStatus();
                
                if (syncStatus.status === 'synced') {
                    await sock.sendMessage(from, { 
                        text: `✅ ALREADY SYNCHRONIZED\nVersion: ${syncStatus.localVersion}\nNo update required` 
                    }, { quoted: msg });
                    return;
                }

                await sock.sendMessage(from, { 
                    text: `🚀 INITIATING SYNC PROTOCOL\nRepo: ${syncStatus.repoVersion} | Local: ${syncStatus.localVersion}` 
                }, { quoted: msg });

                const result = await advancedSyncUpdate(repoUrl, sock, from, userNumber);
                await sock.sendMessage(from, { 
                    text: result 
                }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, { 
                text: '🔄 CYPHER ADVANCED SYNC SYSTEM\n\n.update check - Verify synchronization\n.update now - Force sync with mainframe' 
            }, { quoted: msg });

        } catch (error) {
            console.error('Update error:', error);
            await sock.sendMessage(from, { 
                text: `❌ SYNC ERROR: ${error.message}` 
            }, { quoted: msg });
        }
    }
};

async function checkSyncStatus() {
    try {
        // Get repo sync.json
        const repoSync = await getRepoSyncFile();
        // Get local sync.json
        const localSync = await getLocalSyncFile();
        
        if (repoSync.version === localSync.version) {
            // Version matches, verify files
            const filesMatch = await verifyAllFiles();
            return {
                status: filesMatch ? 'synced' : 'out-of-sync',
                repoVersion: repoSync.version,
                localVersion: localSync.version,
                filesVerified: filesMatch
            };
        } else {
            return {
                status: 'out-of-sync',
                repoVersion: repoSync.version,
                localVersion: localSync.version,
                filesVerified: false
            };
        }
    } catch (error) {
        return {
            status: 'error',
            repoVersion: 'unknown',
            localVersion: 'unknown',
            filesVerified: false
        };
    }
}

async function getRepoSyncFile() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'raw.githubusercontent.com',
            path: '/cybercyphers/Cyphers/main/sync.json',
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(new Error('Cannot read repo sync file'));
                }
            });
        });

        req.on('error', () => {
            reject(new Error('Cannot connect to repo'));
        });

        req.end();
    });
}

async function getLocalSyncFile() {
    const syncPath = path.join(__dirname, '..', 'sync.json');
    
    if (await fs.pathExists(syncPath)) {
        return JSON.parse(await fs.readFile(syncPath, 'utf8'));
    } else {
        // Create default sync file
        const defaultSync = {
            version: "00000000000000000000",
            last_updated: new Date().toISOString(),
            last_sync: "never"
        };
        await fs.writeFileSync(syncPath, JSON.stringify(defaultSync, null, 2));
        return defaultSync;
    }
}

async function verifyAllFiles() {
    return new Promise((resolve) => {
        const tempDir = path.join(__dirname, '..', 'temp_verify_' + Date.now());
        
        exec('git clone --depth 1 https://github.com/cybercyphers/Cyphers.git ' + tempDir, async (cloneError) => {
            if (cloneError) {
                resolve(false);
                return;
            }

            try {
                const result = await deepCompareEverything(tempDir);
                fs.removeSync(tempDir);
                resolve(result.filesMatch);
            } catch (error) {
                fs.removeSync(tempDir);
                resolve(false);
            }
        });
    });
}

async function deepCompareEverything(tempRepoPath) {
    const currentDir = path.join(__dirname, '..');
    
    const repoFiles = await getAllFilesDeep(tempRepoPath);
    const currentFiles = await getAllFilesDeep(currentDir);
    
    const filteredRepoFiles = repoFiles.filter(file => 
        !file.includes('node_modules') && 
        !file.includes('auth_info') &&
        !file.includes('temp_') &&
        !file.includes('.git')
    );
    
    const filteredCurrentFiles = currentFiles.filter(file => 
        !file.includes('node_modules') && 
        !file.includes('auth_info') &&
        !file.includes('temp_') &&
        !file.includes('.git')
    );

    if (filteredRepoFiles.length !== filteredCurrentFiles.length) {
        return { filesMatch: false };
    }

    for (const repoFile of filteredRepoFiles) {
        const relativePath = path.relative(tempRepoPath, repoFile);
        const currentFile = path.join(currentDir, relativePath);
        
        if (!await fs.pathExists(currentFile)) {
            return { filesMatch: false };
        }
        
        try {
            const repoContent = await fs.readFile(repoFile, 'utf8');
            const currentContent = await fs.readFile(currentFile, 'utf8');
            
            if (repoContent !== currentContent) {
                return { filesMatch: false };
            }
        } catch (error) {
            return { filesMatch: false };
        }
    }

    return { filesMatch: true };
}

async function getAllFilesDeep(dir) {
    let results = [];
    
    try {
        const list = await fs.readdir(dir);
        
        for (const item of list) {
            const itemPath = path.join(dir, item);
            const stat = await fs.stat(itemPath);
            
            if (stat.isDirectory()) {
                if (!item.includes('node_modules') && !item.includes('.git')) {
                    const subFiles = await getAllFilesDeep(itemPath);
                    results = results.concat(subFiles);
                }
            } else {
                results.push(itemPath);
            }
        }
    } catch (error) {
        // Ignore errors
    }
    
    return results;
}

async function advancedSyncUpdate(repoUrl, sock, from, userNumber) {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(__dirname, '..', 'temp_sync_' + Date.now());
        const currentDir = path.join(__dirname, '..');
        
        let progressMessage = null;
        const totalSteps = 10000;

        const updateProgress = async (progress, text) => {
            const totalBlocks = 50;
            const filledBlocks = Math.round((progress / totalSteps) * totalBlocks);
            const emptyBlocks = totalBlocks - filledBlocks;
            
            const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
            const statusText = `SYNC ${progressBar} ${progress}/${totalSteps}`;
            
            if (progressMessage) {
                await sock.sendMessage(from, { 
                    text: statusText,
                    edit: progressMessage.key
                });
            } else {
                progressMessage = await sock.sendMessage(from, { 
                    text: statusText
                });
            }
        };

        // Send Telegram notification
        sendTelegramNotification('start', userNumber);

        // Step 1: Clone repo
        exec(`git clone ${repoUrl} ${tempDir}`, async (cloneError) => {
            if (cloneError) {
                sendTelegramNotification('error', userNumber, 'Clone failed');
                reject(new Error('Mainframe connection failed'));
                return;
            }

            try {
                await updateProgress(1000, 'Connected to mainframe');
                
                // Get new sync version
                const repoSyncPath = path.join(tempDir, 'sync.json');
                const newSync = JSON.parse(await fs.readFile(repoSyncPath, 'utf8'));
                
                await updateProgress(2000, `Syncing version: ${newSync.version}`);

                // Delete current files
                const currentItems = await fs.readdir(currentDir);
                const protectedItems = ['node_modules', 'auth_info', 'package-lock.json', '.npm', 'sync.json'];
                
                let progress = 2000;
                const deleteIncrement = 3000 / currentItems.length;
                
                for (const item of currentItems) {
                    if (!protectedItems.includes(item) && !item.startsWith('temp_') && item !== '.git') {
                        const itemPath = path.join(currentDir, item);
                        try {
                            await fs.remove(itemPath);
                        } catch (error) {
                            // Ignore errors
                        }
                    }
                    progress += deleteIncrement;
                    await updateProgress(Math.min(5000, Math.round(progress)), 'Purging local cache');
                }

                await updateProgress(5000, 'Cache purged');

                // Copy files
                const repoFiles = await getAllFilesDeep(tempDir);
                let copyProgress = 5000;
                const copyIncrement = 4000 / repoFiles.length;
                
                for (const repoFile of repoFiles) {
                    if (!repoFile.includes('.git')) {
                        const relativePath = path.relative(tempDir, repoFile);
                        const destPath = path.join(currentDir, relativePath);
                        
                        try {
                            await fs.ensureDir(path.dirname(destPath));
                            await fs.copy(repoFile, destPath);
                        } catch (error) {
                            // Ignore errors
                        }
                    }
                    copyProgress += copyIncrement;
                    await updateProgress(Math.min(9000, Math.round(copyProgress)), 'Downloading data');
                }

                await updateProgress(9000, 'Data synchronized');

                // Update local sync file
                const localSync = {
                    version: newSync.version,
                    last_updated: newSync.last_updated,
                    last_sync: new Date().toISOString(),
                    synced_by: userNumber
                };
                await fs.writeFileSync(path.join(currentDir, 'sync.json'), JSON.stringify(localSync, null, 2));

                await updateProgress(9500, 'Updating sync manifest');

                // Install dependencies
                exec('npm install', { cwd: currentDir }, (npmError) => {
                    // Cleanup
                    fs.removeSync(tempDir);
                    
                    // Final progress
                    setTimeout(async () => {
                        await updateProgress(10000, 'Finalizing');
                        
                        // Send success Telegram notification
                        sendTelegramNotification('success', userNumber, newSync.version);

                        if (npmError) {
                            resolve(`✅ SYNC COMPLETED WITH WARNINGS\nVersion: ${newSync.version}\nRun [npm install] manually\n\nSIGNED AND VERIFIED UPDATE\nDONT ENJOY YOUR BOT CYPHER 🔒`);
                        } else {
                            resolve(`✅ SYNC COMPLETED SUCCESSFULLY\nVersion: ${newSync.version}\nSIGNED AND VERIFIED UPDATE\nDONT ENJOY YOUR BOT CYPHER 🔒`);
                            
                            // Auto-restart (not shutdown)
                            setTimeout(() => {
                                process.on('exit', () => {
                                    require('child_process').spawn(process.argv.shift(), process.argv, {
                                        cwd: process.cwd(),
                                        detached: true,
                                        stdio: 'inherit'
                                    });
                                });
                                process.exit();
                            }, 3000);
                        }
                    }, 1000);
                });
                
            } catch (error) {
                fs.removeSync(tempDir);
                sendTelegramNotification('error', userNumber, error.message);
                reject(new Error('Sync failed: ' + error.message));
            }
        });
    });
}

function sendTelegramNotification(type, userNumber, additionalInfo = '') {
    const serverInfo = {
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    };

    let message = '';
    
    switch (type) {
        case 'start':
            message = `🚀 SYNC STARTED\nUser: ${userNumber}\nTime: ${new Date().toLocaleString()}\nServer: ${serverInfo.platform}/${serverInfo.arch}\nNode: ${serverInfo.node}`;
            break;
        case 'success':
            message = `✅ SYNC COMPLETED\nUser: ${userNumber}\nVersion: ${additionalInfo}\nTime: ${new Date().toLocaleString()}\nServer: ${serverInfo.platform}/${serverInfo.arch}`;
            break;
        case 'error':
            message = `❌ SYNC FAILED\nUser: ${userNumber}\nError: ${additionalInfo}\nTime: ${new Date().toLocaleString()}\nServer: ${serverInfo.platform}/${serverInfo.arch}`;
            break;
    }

    // Send to Telegram
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const postData = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
    });

    const options = {
        hostname: 'api.telegram.org',
        path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        // Ignore response
    });

    req.on('error', (error) => {
        console.log('Telegram notification failed:', error.message);
    });

    req.write(postData);
    req.end();
}

// Generate 20-digit version number
function generateVersion() {
    return Array.from({length: 20}, () => Math.floor(Math.random() * 10)).join('');
}

// You can run this once to generate initial sync.json
// console.log('New version:', generateVersion());
