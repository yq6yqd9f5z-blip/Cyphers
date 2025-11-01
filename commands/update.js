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
                    text: '🔍 Scanning for update...' 
                }, { quoted: msg });

                const updateInfo = await deepCheckForUpdates(repoUrl);
                
                if (updateInfo.status === 'up-to-date') {
                    await sock.sendMessage(from, { 
                        text: '✅ Bot is up to date!' 
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { 
                        text: `📦 Updates available!\n\n🔄 Use .update now to install` 
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
                text: '🔄 Update System\n\n.update check - Deep check\n.update now - Force update' 
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
        
        console.log('🔍 Deep signing update...');
        
        exec(`git clone ${repoUrl} ${tempDir}`, async (cloneError) => {
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
    
    console.log('📊 Comparing every file character by character...');
    
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

    console.log(`📁 Repo files: ${filteredRepoFiles.length}, Current files: ${filteredCurrentFiles.length}`);

    // Check if file counts match
    if (filteredRepoFiles.length !== filteredCurrentFiles.length) {
        console.log(`❌ File count mismatch: ${filteredRepoFiles.length} vs ${filteredCurrentFiles.length}`);
        return { 
            status: 'updates-available',
            reason: `File count mismatch: ${filteredRepoFiles.length} vs ${filteredCurrentFiles.length}`
        };
    }

    // Check every single file character by character
    let differencesFound = 0;
    
    for (const repoFile of filteredRepoFiles) {
        const relativePath = path.relative(tempRepoPath, repoFile);
        const currentFile = path.join(currentDir, relativePath);
        
        // Check if file exists in current location
        if (!await fs.pathExists(currentFile)) {
            console.log(`❌ Missing file: ${relativePath}`);
            differencesFound++;
            continue;
        }
        
        // Compare file content character by character
        try {
            const repoContent = await fs.readFile(repoFile, 'utf8');
            const currentContent = await fs.readFile(currentFile, 'utf8');
            
            if (repoContent !== currentContent) {
                console.log(`❌ Content mismatch: ${relativePath}`);
                console.log(`   Repo: ${repoContent.length} chars, Current: ${currentContent.length} chars`);
                differencesFound++;
            } else {
                console.log(`✅ Match: ${relativePath}`);
            }
        } catch (error) {
            console.log(`❌ Error reading: ${relativePath}`);
            differencesFound++;
        }
    }

    if (differencesFound > 0) {
        return { 
            status: 'updates-available',
            reason: `${differencesFound} files have differences`
        };
    }

    console.log('✅ All files are identical!');
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
        console.log(`⚠️ Cannot read: ${dir}`);
    }
    
    return results;
}

async function deepForceUpdate(repoUrl) {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(__dirname, '..', 'temp_deep_update_' + Date.now());
        const currentDir = path.join(__dirname, '..');
        
        console.log('🚀 Starting deep force update...');
        
        // Step 1: Clone fresh repo
        exec(`git clone ${repoUrl} ${tempDir}`, async (cloneError) => {
            if (cloneError) {
                reject(new Error('Download failed'));
                return;
            }

            console.log('🔄 Force replacing ALL files...');
            
            try {
                // Step 2: Get ALL files from repo
                const repoFiles = await getAllFilesDeep(tempDir);
                
                // Step 3: Delete ALL current files (except protected ones)
                console.log('🗑️ Deleting current files...');
                const currentItems = await fs.readdir(currentDir);
                const protectedItems = ['node_modules', 'auth_info', 'package-lock.json', '.npm'];
                
                for (const item of currentItems) {
                    if (!protectedItems.includes(item) && !item.startsWith('temp_') && item !== '.git') {
                        const itemPath = path.join(currentDir, item);
                        try {
                            await fs.remove(itemPath);
                            console.log(`🗑️ Deleted: ${item}`);
                        } catch (error) {
                            console.log(`⚠️ Could not delete: ${item}`);
                        }
                    }
                }

                // Step 4: Copy EVERY SINGLE FILE from repo
                console.log('📁 Copying ALL files from repository...');
                let copiedCount = 0;
                let errorCount = 0;
                
                for (const repoFile of repoFiles) {
                    if (!repoFile.includes('.git')) {
                        const relativePath = path.relative(tempDir, repoFile); // FIXED: Use tempDir instead of tempRepoPath
                        const destPath = path.join(currentDir, relativePath);
                        
                        try {
                            // Ensure destination directory exists
                            await fs.ensureDir(path.dirname(destPath));
                            
                            // Copy file
                            await fs.copy(repoFile, destPath);
                            copiedCount++;
                            
                            // Verify the copy was successful
                            if (await fs.pathExists(destPath)) {
                                const sourceStats = await fs.stat(repoFile);
                                const destStats = await fs.stat(destPath);
                                
                                if (sourceStats.size === destStats.size) {
                                    console.log(`✅ Copied: ${relativePath} (${sourceStats.size} bytes)`);
                                } else {
                                    console.log(`⚠️ Size mismatch: ${relativePath}`);
                                    errorCount++;
                                }
                            } else {
                                console.log(`❌ Copy failed: ${relativePath}`);
                                errorCount++;
                            }
                        } catch (error) {
                            console.log(`❌ Error copying: ${relativePath} - ${error.message}`);
                            errorCount++;
                        }
                    }
                }

                console.log(`📊 Copy results: ${copiedCount} successful, ${errorCount} errors`);

                // Step 5: SPECIAL HANDLING FOR HANDLERS FOLDER
                console.log('🔧 Special verification for handlers folder...');
                const handlersPath = path.join(currentDir, 'handlers');
                
                if (await fs.pathExists(handlersPath)) {
                    const handlerFiles = await fs.readdir(handlersPath);
                    console.log(`📁 Handlers folder contains: ${handlerFiles.length} files`);
                    
                    // Verify each handler file
                    for (const handlerFile of handlerFiles) {
                        const handlerFilePath = path.join(handlersPath, handlerFile);
                        try {
                            const stats = await fs.stat(handlerFilePath);
                            const content = await fs.readFile(handlerFilePath, 'utf8');
                            console.log(`📄 ${handlerFile}: ${stats.size} bytes, ${content.length} chars`);
                            
                            // Check if it's a valid JavaScript file
                            if (content.includes('module.exports') || content.includes('exports.')) {
                                console.log(`✅ ${handlerFile} is valid JavaScript`);
                            } else {
                                console.log(`⚠️ ${handlerFile} may not be valid JavaScript`);
                            }
                        } catch (error) {
                            console.log(`❌ Cannot read handler: ${handlerFile}`);
                        }
                    }
                } else {
                    console.log('❌ CRITICAL: Handlers folder missing after update!');
                    // Try to copy handlers folder specifically
                    const repoHandlersPath = path.join(tempDir, 'handlers');
                    if (await fs.pathExists(repoHandlersPath)) {
                        console.log('🔄 Emergency copying handlers folder...');
                        await fs.copy(repoHandlersPath, handlersPath);
                        console.log('✅ Handlers folder emergency copied');
                    }
                }

                console.log('📦 Installing dependencies...');
                
                // Step 6: Install dependencies
                exec('npm install', { cwd: currentDir }, (npmError) => {
                    // Step 7: Cleanup
                    fs.removeSync(tempDir);
                    
                    if (npmError) {
                        console.log('NPM install warning:', npmError.message);
                        resolve('✅ Files updated! Run npm install manually.');
                    } else {
                        console.log('✅ Deep update complete, restarting...');
                        
                        // Final verification
                        setTimeout(async () => {
                            console.log('🔍 Final verification...');
                            try {
                                const finalCheck = await deepCheckForUpdates(repoUrl);
                                if (finalCheck.status === 'up-to-date') {
                                    console.log('🎉 SUCCESS: Bot is perfectly synced with repository!');
                                } else {
                                    console.log('⚠️ WARNING: Some files may not be synced properly');
                                }
                            } catch (error) {
                                console.log('⚠️ Final check failed:', error.message);
                            }
                            
                            process.exit(0);
                        }, 3000);
                        
                        resolve('✅ Deep update complete! Bot restarting...');
                    }
                });
                
            } catch (error) {
                fs.removeSync(tempDir);
                reject(new Error('Deep update failed: ' + error.message));
            }
        });
    });
}
