const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');

module.exports = {
    name: 'update',
    description: 'Update bot ',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            const action = args[0]?.toLowerCase();
            const repoUrl = 'https://github.com/cybercyphers/Cyphers.git';

            if (action === 'check') {
                await sock.sendMessage(from, { 
                    text: '🔍 Deep scanning update and verifying...' 
                }, { quoted: msg });

                const updateInfo = await deepCheckForUpdates(repoUrl);
                
                if (updateInfo.status === 'up-to-date') {
                    await sock.sendMessage(from, { 
                        text: '✅ Bot is perfectly up to date!' 
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { 
                        text: `📦 Updates available!\n\n${updateInfo.reason}\n\n🔄 Use .update now to force sync` 
                    }, { quoted: msg });
                }
                return;
            }

            if (action === 'now') {
                await sock.sendMessage(from, { 
                    text: '🚀 Starting update...' 
                }, { quoted: msg });

                const result = await deepForceUpdate(repoUrl);
                await sock.sendMessage(from, { 
                    text: result 
                }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, { 
                text: '🔄 Advanced Update System\n\n.update check - Deep character comparison\n.update now - Force complete sync' 
            }, { quoted: msg });

        } catch (error) {
            console.error('Update error:', error);
            await sock.sendMessage(from, { 
                text: `❌ Update error: ${error.message}` 
            }, { quoted: msg });
        }
    }
};

async function deepCheckForUpdates(repoUrl) {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(__dirname, '..', 'temp_deep_check_' + Date.now());
        
        console.log('🔍 scanning signed update....');
        
        exec(`git clone --depth 1 ${repoUrl} ${tempDir}`, async (cloneError) => {
            if (cloneError) {
                reject(new Error('Cannot access update'));
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
    
    console.log('📊 update comparison started...');
    
    // Get ALL files from both locations
    const repoFiles = await getAllFilesDeep(tempRepoPath);
    const currentFiles = await getAllFilesDeep(currentDir);
    
    // Filter out system files
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

    console.log(`📁 Repo: ${filteredRepoFiles.length} files | Local: ${filteredCurrentFiles.length} files`);

    // Check 1: File count comparison
    if (filteredRepoFiles.length !== filteredCurrentFiles.length) {
        const reason = `File count mismatch: Repository has ${filteredRepoFiles.length} files, Local has ${filteredCurrentFiles.length} files`;
        console.log(`❌ ${reason}`);
        return { 
            status: 'updates-available',
            reason: reason
        };
    }

    // Check 2: File existence and content comparison
    let missingFiles = [];
    let differentFiles = [];
    let identicalFiles = 0;
    
    for (const repoFile of filteredRepoFiles) {
        const relativePath = path.relative(tempRepoPath, repoFile);
        const currentFile = path.join(currentDir, relativePath);
        
        // Check if file exists in current location
        if (!await fs.pathExists(currentFile)) {
            missingFiles.push(relativePath);
            continue;
        }
        
        // Compare file content character by character
        try {
            const repoContent = await fs.readFile(repoFile, 'utf8');
            const currentContent = await fs.readFile(currentFile, 'utf8');
            
            if (repoContent !== currentContent) {
                differentFiles.push({
                    file: relativePath,
                    repoSize: repoContent.length,
                    localSize: currentContent.length,
                    difference: Math.abs(repoContent.length - currentContent.length)
                });
            } else {
                identicalFiles++;
            }
        } catch (error) {
            differentFiles.push({
                file: relativePath,
                error: 'Cannot read file'
            });
        }
    }

    console.log(`📊 Results: ${identicalFiles} identical, ${differentFiles.length} different, ${missingFiles.length} missing`);

    if (missingFiles.length > 0 || differentFiles.length > 0) {
        let reason = '';
        if (missingFiles.length > 0) {
            reason += `Missing: ${missingFiles.length} files\n`;
        }
        if (differentFiles.length > 0) {
            reason += `Different: ${differentFiles.length} files\n`;
        }
        if (identicalFiles > 0) {
            reason += `Identical: ${identicalFiles} files`;
        }
        
        return { 
            status: 'updates-available',
            reason: reason.trim()
        };
    }

    console.log('🎉 PERFECT MATCH: All files are identical character-by-character!');
    return { 
        status: 'up-to-date',
        reason: 'signed update done '
    };
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
        console.log(`⚠️ Cannot read directory: ${dir}`);
    }
    
    return results;
}

async function deepForceUpdate(repoUrl) {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(__dirname, '..', 'temp_deep_update_' + Date.now());
        const currentDir = path.join(__dirname, '..');
        
        console.log('🚀 INITIATING COMPLET SYNC...');
        
        // Step 1: Clone fresh repo
        exec(`git clone ${repoUrl} ${tempDir}`, async (cloneError) => {
            if (cloneError) {
                reject(new Error('update download failed'));
                return;
            }

            console.log('🔄 FORCE SYNC: Replacing ALL files...');
            
            try {
                // Step 2: Get ALL files from repo
                const repoFiles = await getAllFilesDeep(tempDir);
                
                // Step 3: Delete ALL current files (except protected ones)
                console.log('🗑️ DELETING current update bye bye ...');
                const currentItems = await fs.readdir(currentDir);
                const protectedItems = ['node_modules', 'auth_info', 'package-lock.json', '.npm'];
                
                let deletedCount = 0;
                for (const item of currentItems) {
                    if (!protectedItems.includes(item) && !item.startsWith('temp_') && item !== '.git') {
                        const itemPath = path.join(currentDir, item);
                        try {
                            await fs.remove(itemPath);
                            deletedCount++;
                            console.log(`🗑️ Deleted: ${item}`);
                        } catch (error) {
                            console.log(`⚠️ Could not delete: ${item}`);
                        }
                    }
                }
                console.log(`🗑️ Total deleted: ${deletedCount} items`);

                // Step 4: Copy EVERY SINGLE FILE from repo
                console.log('📁 COPYING all repository files...');
                let copiedCount = 0;
                let errorCount = 0;
                
                for (const repoFile of repoFiles) {
                    if (!repoFile.includes('.git')) {
                        const relativePath = path.relative(tempDir, repoFile);
                        const destPath = path.join(currentDir, relativePath);
                        
                        try {
                            // Ensure destination directory exists
                            await fs.ensureDir(path.dirname(destPath));
                            
                            // Copy file with verification
                            await fs.copy(repoFile, destPath);
                            
                            // Verify copy was successful
                            if (await fs.pathExists(destPath)) {
                                const sourceStats = await fs.stat(repoFile);
                                const destStats = await fs.stat(destPath);
                                
                                if (sourceStats.size === destStats.size) {
                                    copiedCount++;
                                    console.log(`✅ ${relativePath} (${sourceStats.size} bytes)`);
                                } else {
                                    console.log(`⚠️ Size mismatch: ${relativePath}`);
                                    errorCount++;
                                }
                            } else {
                                console.log(`❌ Copy failed: ${relativePath}`);
                                errorCount++;
                            }
                        } catch (error) {
                            console.log(`❌ Error: ${relativePath} - ${error.message}`);
                            errorCount++;
                        }
                    }
                }

                console.log(`📊 COPY RESULTS: ${copiedCount} successful, ${errorCount} errors`);

                // Step 5: Final verification
                console.log('🔍 FINAL VERIFICATION...');
                const finalStats = await getFolderStats(currentDir);
                console.log(`📁 Final state: ${finalStats.files} files, ${finalStats.folders} folders`);

                console.log('📦 Installing dependencies...');
                
                // Step 6: Install dependencies
                exec('npm install', { cwd: currentDir }, (npmError) => {
                    // Step 7: Cleanup
                    fs.removeSync(tempDir);
                    
                    if (npmError) {
                        console.log('NPM install warning:', npmError.message);
                        resolve('✅ Files synced! Run npm install manually and restart.');
                    } else {
                        console.log('✅ COMPLETE SYNC: old update replace , restarting...');
                        
                        setTimeout(() => {
                            process.exit(0);
                        }, 3000);
                        
                        resolve('✅ Complete sync successful signed update update ! Bot restarting...enjoy  the bot CYPHERS ..............type .menu');
                    }
                });
                
            } catch (error) {
                fs.removeSync(tempDir);
                reject(new Error('Force sync failed: ' + error.message));
            }
        });
    });
}

async function getFolderStats(dir) {
    let files = 0;
    let folders = 0;
    
    try {
        const items = await fs.readdir(dir);
        
        for (const item of items) {
            const itemPath = path.join(dir, item);
            const stat = await fs.stat(itemPath);
            
            if (stat.isDirectory()) {
                if (!item.includes('node_modules') && !item.includes('.git')) {
                    folders++;
                    const subStats = await getFolderStats(itemPath);
                    files += subStats.files;
                    folders += subStats.folders;
                }
            } else {
                files++;
            }
        }
    } catch (error) {
        // Ignore errors
    }
    
    return { files, folders };
}
