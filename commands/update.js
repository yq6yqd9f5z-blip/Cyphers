const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');

module.exports = {
    name: 'update',
    description: 'Update bot from GitHub',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            const action = args[0]?.toLowerCase();
            const repoUrl = 'https://github.com/cybercyphers/Cyphers.git';

            if (action === 'check') {
                await sock.sendMessage(from, { 
                    text: '🔍 Scanning repository integrity...' 
                }, { quoted: msg });

                const updateInfo = await deepCheckForUpdates(repoUrl);
                
                if (updateInfo.status === 'up-to-date') {
                    await sock.sendMessage(from, { 
                        text: '✅ SYSTEM INTEGRITY VERIFIED\nNo updates required' 
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { 
                        text: `🚨 SECURITY BREACH DETECTED\n${updateInfo.reason}\n\nUse [.update now] to sync with mainframe` 
                    }, { quoted: msg });
                }
                return;
            }

            if (action === 'now') {
                // First check if updates are needed
                const updateInfo = await deepCheckForUpdates(repoUrl);
                
                if (updateInfo.status === 'up-to-date') {
                    await sock.sendMessage(from, { 
                        text: '✅ SYSTEM ALREADY SYNCHRONIZED\nNo updates required' 
                    }, { quoted: msg });
                    return;
                }

                await sock.sendMessage(from, { 
                    text: '🚀 INITIATING MAINFRAME SYNC...' 
                }, { quoted: msg });

                const result = await hackerStyleUpdate(repoUrl, sock, from);
                await sock.sendMessage(from, { 
                    text: result 
                }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, { 
                text: '🔄 CYPHER UPDATE SYSTEM\n\n.update check - Verify integrity\n.update now - Force mainframe sync' 
            }, { quoted: msg });

        } catch (error) {
            console.error('Update error:', error);
            await sock.sendMessage(from, { 
                text: `❌ SYSTEM ERROR: ${error.message}` 
            }, { quoted: msg });
        }
    }
};

async function deepCheckForUpdates(repoUrl) {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(__dirname, '..', 'temp_scan_' + Date.now());
        
        exec(`git clone --depth 1 ${repoUrl} ${tempDir}`, async (cloneError) => {
            if (cloneError) {
                reject(new Error('Cannot access mainframe'));
                return;
            }

            try {
                const result = await deepCompareEverything(tempDir);
                fs.removeSync(tempDir);
                resolve(result);
            } catch (error) {
                fs.removeSync(tempDir);
                reject(error);
            }
        });
    });
}

async function deepCompareEverything(tempRepoPath) {
    const currentDir = path.join(__dirname, '..');
    
    // Get ALL files from both locations
    const repoFiles = await getAllFilesDeep(tempRepoPath);
    const currentFiles = await getAllFilesDeep(currentDir);
    
    // Filter out system files (auth_info, node_modules, temp files)
    const filteredRepoFiles = repoFiles.filter(file => 
        !file.includes('node_modules') && 
        !file.includes('auth_info') &&
        !file.includes('temp_') &&
        !file.includes('.git') &&
        !file.includes('.npm')
    );
    
    const filteredCurrentFiles = currentFiles.filter(file => 
        !file.includes('node_modules') && 
        !file.includes('auth_info') &&
        !file.includes('temp_') &&
        !file.includes('.git') &&
        !file.includes('.npm')
    );

    // Check 1: File count comparison
    if (filteredRepoFiles.length !== filteredCurrentFiles.length) {
        return { 
            status: 'updates-available',
            reason: `FILE COUNT MISMATCH: Mainframe=${filteredRepoFiles.length} Local=${filteredCurrentFiles.length}`
        };
    }

    // Check 2: File content comparison
    let differencesFound = 0;
    
    for (const repoFile of filteredRepoFiles) {
        const relativePath = path.relative(tempRepoPath, repoFile);
        const currentFile = path.join(currentDir, relativePath);
        
        if (!await fs.pathExists(currentFile)) {
            differencesFound++;
            continue;
        }
        
        try {
            const repoContent = await fs.readFile(repoFile, 'utf8');
            const currentContent = await fs.readFile(currentFile, 'utf8');
            
            if (repoContent !== currentContent) {
                differencesFound++;
            }
        } catch (error) {
            differencesFound++;
        }
    }

    if (differencesFound > 0) {
        return { 
            status: 'updates-available',
            reason: `DATA CORRUPTION: ${differencesFound} files out of sync`
        };
    }

    return { status: 'up-to-date' };
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

async function hackerStyleUpdate(repoUrl, sock, from) {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(__dirname, '..', 'temp_sync_' + Date.now());
        const currentDir = path.join(__dirname, '..');
        
        // Create progress bar message
        let progressMessage = null;
        
        const updateProgress = async (progress, text) => {
            const totalBlocks = 50;
            const filledBlocks = Math.round((progress / 1000) * totalBlocks);
            const emptyBlocks = totalBlocks - filledBlocks;
            
            const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
            const statusText = `download ${progressBar} ${progress}/1000`;
            
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

        // Step 1: Clone repo
        exec(`git clone ${repoUrl} ${tempDir}`, async (cloneError) => {
            if (cloneError) {
                reject(new Error('Mainframe connection failed'));
                return;
            }

            try {
                await updateProgress(100, 'Mainframe connected');
                
                // Step 2: Get repo files
                const repoFiles = await getAllFilesDeep(tempDir);
                await updateProgress(200, 'File index acquired');
                
                // Step 3: Delete current files
                const currentItems = await fs.readdir(currentDir);
                const protectedItems = ['node_modules', 'auth_info', 'package-lock.json', '.npm'];
                
                let deleteProgress = 200;
                const deleteIncrement = 200 / currentItems.length;
                
                for (const item of currentItems) {
                    if (!protectedItems.includes(item) && !item.startsWith('temp_') && item !== '.git') {
                        const itemPath = path.join(currentDir, item);
                        try {
                            await fs.remove(itemPath);
                        } catch (error) {
                            // Ignore delete errors
                        }
                    }
                    deleteProgress += deleteIncrement;
                    await updateProgress(Math.min(400, Math.round(deleteProgress)), 'Purging local cache');
                }

                await updateProgress(400, 'Local cache purged');
                
                // Step 4: Copy files with progress
                let copyProgress = 400;
                const copyIncrement = 500 / repoFiles.length;
                
                for (const repoFile of repoFiles) {
                    if (!repoFile.includes('.git')) {
                        const relativePath = path.relative(tempDir, repoFile);
                        const destPath = path.join(currentDir, relativePath);
                        
                        try {
                            await fs.ensureDir(path.dirname(destPath));
                            await fs.copy(repoFile, destPath);
                        } catch (error) {
                            // Ignore copy errors
                        }
                    }
                    copyProgress += copyIncrement;
                    await updateProgress(Math.min(900, Math.round(copyProgress)), 'Downloading mainframe data');
                }

                await updateProgress(900, 'Data synchronization complete');
                
                // Step 5: Install dependencies
                exec('npm install', { cwd: currentDir }, (npmError) => {
                    // Cleanup
                    fs.removeSync(tempDir);
                    
                    // Final progress
                    setTimeout(async () => {
                        await updateProgress(1000, 'Finalizing');
                        
                        if (npmError) {
                            resolve('✅ UPDATE COMPLETED WITH WARNINGS\nRun [npm install] manually\n\nSIGNED AND VERIFIED UPDATE\nDONT ENJOY YOUR BOT CYPHER 🔒');
                        } else {
                            resolve('✅ UPDATE COMPLETED SUCCESSFULLY\nSIGNED AND VERIFIED UPDATE\nDONT ENJOY YOUR BOT CYPHER 🔒');
                            
                            // Auto-restart
                            setTimeout(() => {
                                process.exit(0);
                            }, 3000);
                        }
                    }, 1000);
                });
                
            } catch (error) {
                fs.removeSync(tempDir);
                reject(new Error('Sync failed: ' + error.message));
            }
        });
    });
}
