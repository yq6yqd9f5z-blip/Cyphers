const axios = require('axios');

module.exports = {
    name: 'dp',
    description: 'Advanced profile picture download - Reply only',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            // MUST reply to a message - this is safer
            if (!msg.message?.extendedTextMessage?.contextInfo?.participant) {
                await sock.sendMessage(from, {
                    text: '❌ *Reply Required*\n\nYou must reply to someone\'s message to use this command.'
                }, { quoted: msg });
                return;
            }

            const targetJid = msg.message.extendedTextMessage.contextInfo.participant;
            const phoneNumber = targetJid.split('@')[0];

            // React immediately with 🙄
            await sock.sendMessage(from, {
                react: {
                    text: '🙄',
                    key: msg.key
                }
            });

            // Get YOUR personal chat
            const senderJid = msg.key.participant || from;
            const yourNumber = senderJid.split('@')[0];
            const yourPersonalChat = `${yourNumber}@s.whatsapp.net`;

            console.log(`🔄 Advanced DP for: ${phoneNumber}`);

            // Use advanced method with multiple fallbacks
            const result = await advancedProfilePictureDownload(sock, targetJid, phoneNumber);
            
            if (result.success) {
                await sock.sendMessage(yourPersonalChat, {
                    image: { url: result.url },
                    caption: `👤 ${phoneNumber}\n🕒 ${new Date().toLocaleTimeString()}`
                });
                
                // Success react
                await sock.sendMessage(from, {
                    react: {
                        text: '✅',
                        key: msg.key
                    }
                });
                
            } else {
                await sock.sendMessage(yourPersonalChat, {
                    text: `❌ *Profile Not Available*\n\n📱 ${phoneNumber}\n\n*Reasons:*\n• No profile picture set\n• Privacy settings enabled\n• User not in contacts`
                });
                
                // Error react
                await sock.sendMessage(from, {
                    react: {
                        text: '❌',
                        key: msg.key
                    }
                });
            }

        } catch (error) {
            console.error('Advanced DP error:', error.message);
            // Silent fail - no error messages
        }
    }
};

// Advanced download with multiple safe methods
async function advancedProfilePictureDownload(sock, targetJid, phoneNumber) {
    return new Promise(async (resolve) => {
        try {
            console.log(`🔍 Starting advanced download for ${phoneNumber}`);

            // METHOD 1: Direct WhatsApp API (safest)
            try {
                console.log('🔄 Method 1: Direct API');
                const profilePic = await sock.profilePictureUrl(targetJid, 'image');
                if (profilePic && isValidImageUrl(profilePic)) {
                    console.log('✅ Direct API success');
                    return resolve({
                        success: true,
                        url: profilePic,
                        method: 'direct',
                        quality: 'high'
                    });
                }
            } catch (error) {
                console.log('❌ Method 1 failed:', error.message);
            }

            // METHOD 2: Preview image
            try {
                console.log('🔄 Method 2: Preview');
                await delay(1000); // Safety delay
                const previewPic = await sock.profilePictureUrl(targetJid, 'preview');
                if (previewPic && isValidImageUrl(previewPic)) {
                    console.log('✅ Preview success');
                    return resolve({
                        success: true,
                        url: previewPic,
                        method: 'preview',
                        quality: 'medium'
                    });
                }
            } catch (error) {
                console.log('❌ Method 2 failed:', error.message);
            }

            // METHOD 3: Contact-based approach
            try {
                console.log('🔄 Method 3: Contact refresh');
                await delay(1500);
                
                // Try to send a presence update to refresh contact
                await sock.sendPresenceUpdate('available', targetJid);
                await delay(1000);
                
                const refreshedPic = await sock.profilePictureUrl(targetJid, 'image');
                if (refreshedPic && isValidImageUrl(refreshedPic)) {
                    console.log('✅ Contact refresh success');
                    return resolve({
                        success: true,
                        url: refreshedPic,
                        method: 'contact_refresh',
                        quality: 'high'
                    });
                }
            } catch (error) {
                console.log('❌ Method 3 failed:', error.message);
            }

            // METHOD 4: Group context (if in group)
            try {
                console.log('🔄 Method 4: Group context');
                if (targetJid.includes('@g.us')) {
                    // Already in group context
                    const groupPic = await sock.profilePictureUrl(targetJid, 'image');
                    if (groupPic && isValidImageUrl(groupPic)) {
                        console.log('✅ Group context success');
                        return resolve({
                            success: true,
                            url: groupPic,
                            method: 'group_context',
                            quality: 'high'
                        });
                    }
                }
            } catch (error) {
                console.log('❌ Method 4 failed:', error.message);
            }

            // All methods failed
            console.log('❌ All methods failed for:', phoneNumber);
            resolve({ 
                success: false, 
                error: 'No accessible profile picture',
                phoneNumber: phoneNumber
            });

        } catch (error) {
            console.error('Advanced download error:', error.message);
            resolve({ 
                success: false, 
                error: error.message 
            });
        }
    });
}

// Utility functions
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidImageUrl(url) {
    if (!url) return false;
    if (typeof url !== 'string') return false;
    if (url.includes('default') || url.includes('placeholder')) return false;
    return url.startsWith('http');
}

// Stealth version - completely silent
module.exports.stealth = {
    name: 'sdp',
    description: 'Stealth profile picture - No messages',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            // Must reply to message
            if (!msg.message?.extendedTextMessage?.contextInfo?.participant) {
                return; // Silent fail
            }

            const targetJid = msg.message.extendedTextMessage.contextInfo.participant;
            const phoneNumber = targetJid.split('@')[0];

            // React only
            await sock.sendMessage(from, {
                react: {
                    text: '🙄',
                    key: msg.key
                }
            });

            // Get personal chat
            const senderJid = msg.key.participant || from;
            const yourNumber = senderJid.split('@')[0];
            const yourPersonalChat = `${yourNumber}@s.whatsapp.net`;

            // Silent download - no error messages
            try {
                const profilePic = await sock.profilePictureUrl(targetJid, 'image');
                if (profilePic && isValidImageUrl(profilePic)) {
                    await sock.sendMessage(yourPersonalChat, {
                        image: { url: profilePic }
                        // No caption for maximum stealth
                    });
                }
                // If no profile pic, do nothing (complete silence)
            } catch (error) {
                // Silent fail - no error messages
            }

        } catch (error) {
            // Complete silence on errors
        }
    }
};

// Quick batch for multiple replies
module.exports.batch = {
    name: 'batchdp',
    description: 'Batch download from multiple replies',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            // Must reply to message
            if (!msg.message?.extendedTextMessage?.contextInfo?.participant) {
                await sock.sendMessage(from, {
                    text: 'Reply to a message to use batch download'
                }, { quoted: msg });
                return;
            }

            const targetJid = msg.message.extendedTextMessage.contextInfo.participant;
            const phoneNumber = targetJid.split('@')[0];

            // React
            await sock.sendMessage(from, {
                react: {
                    text: '🙄',
                    key: msg.key
                }
            });

            // Get personal chat
            const senderJid = msg.key.participant || from;
            const yourNumber = senderJid.split('@')[0];
            const yourPersonalChat = `${yourNumber}@s.whatsapp.net`;

            const count = parseInt(args[0]) || 1;
            const maxCount = Math.min(count, 5); // Limit to 5 for safety

            console.log(`🔄 Batch download: ${maxCount} attempts`);

            let successCount = 0;
            
            for (let i = 0; i < maxCount; i++) {
                try {
                    await delay(2000 + (i * 1000)); // Progressive delay
                    
                    const profilePic = await sock.profilePictureUrl(targetJid, 'image');
                    if (profilePic && isValidImageUrl(profilePic)) {
                        await sock.sendMessage(yourPersonalChat, {
                            image: { url: profilePic },
                            caption: `👤 ${phoneNumber}\n🔄 Attempt ${i + 1}/${maxCount}`
                        });
                        successCount++;
                        
                        // Small success react
                        await sock.sendMessage(from, {
                            react: {
                                text: '✅',
                                key: msg.key
                            }
                        });
                    }
                } catch (error) {
                    console.log(`Attempt ${i + 1} failed:`, error.message);
                }
            }

            // Send summary
            if (successCount > 0) {
                await sock.sendMessage(yourPersonalChat, {
                    text: `📊 Batch complete!\n✅ Success: ${successCount}/${maxCount}\n📱 ${phoneNumber}`
                });
            } else {
                await sock.sendMessage(yourPersonalChat, {
                    text: `❌ Batch failed\n📱 ${phoneNumber}\nAll ${maxCount} attempts failed`
                });
            }

        } catch (error) {
            console.error('Batch DP error:', error.message);
        }
    }
};

// Smart DP with auto-retry
module.exports.smart = {
    name: 'smartdp',
    description: 'Smart download with auto-retry logic',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            if (!msg.message?.extendedTextMessage?.contextInfo?.participant) {
                await sock.sendMessage(from, {
                    text: 'Reply to a message for smart download'
                }, { quoted: msg });
                return;
            }

            const targetJid = msg.message.extendedTextMessage.contextInfo.participant;
            const phoneNumber = targetJid.split('@')[0];

            // React
            await sock.sendMessage(from, {
                react: {
                    text: '🧠',
                    key: msg.key
                }
            });

            // Get personal chat
            const senderJid = msg.key.participant || from;
            const yourNumber = senderJid.split('@')[0];
            const yourPersonalChat = `${yourNumber}@s.whatsapp.net`;

            console.log(`🧠 Smart DP for: ${phoneNumber}`);

            // Smart retry logic
            const result = await smartRetryDownload(sock, targetJid, phoneNumber);
            
            if (result.success) {
                await sock.sendMessage(yourPersonalChat, {
                    image: { url: result.url },
                    caption: `👤 ${phoneNumber}\n🧠 Smart method: ${result.method}\n⚡ Attempts: ${result.attempts}`
                });
                
                await sock.sendMessage(from, {
                    react: {
                        text: '✅',
                        key: msg.key
                    }
                });
            } else {
                await sock.sendMessage(yourPersonalChat, {
                    text: `❌ Smart download failed\n📱 ${phoneNumber}\n🔄 Attempts: ${result.attempts}\n💡 Try again later`
                });
            }

        } catch (error) {
            console.error('Smart DP error:', error.message);
        }
    }
};

async function smartRetryDownload(sock, targetJid, phoneNumber) {
    const maxAttempts = 3;
    const methods = ['image', 'preview'];
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`🧠 Smart attempt ${attempt}/${maxAttempts}`);
        
        for (const method of methods) {
            try {
                await delay(attempt * 1000); // Progressive delay
                
                const profilePic = await sock.profilePictureUrl(targetJid, method);
                if (profilePic && isValidImageUrl(profilePic)) {
                    return {
                        success: true,
                        url: profilePic,
                        method: method,
                        attempts: attempt
                    };
                }
            } catch (error) {
                console.log(`Attempt ${attempt}, method ${method} failed:`, error.message);
            }
        }
    }
    
    return {
        success: false,
        attempts: maxAttempts,
        error: 'All smart attempts failed'
    };
}
