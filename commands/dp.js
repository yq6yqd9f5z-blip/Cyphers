const axios = require('axios');

// Rate limiting to prevent blocking
let lastRequestTime = 0;
const MIN_TIME_BETWEEN_REQUESTS = 30000; // 30 seconds between requests
let requestCount = 0;
const MAX_REQUESTS_PER_HOUR = 10;

module.exports = {
    name: 'dp',
    description: 'Ultra-safe profile picture download',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            // MUST reply to a message - this is critical for safety
            if (!msg.message?.extendedTextMessage?.contextInfo?.participant) {
                await sock.sendMessage(from, {
                    text: '❌ *Safety Feature*\n\nYou must reply to someone\'s message to use this command.\n\nThis prevents WhatsApp from blocking the server.'
                }, { quoted: msg });
                return;
            }

            // Rate limiting check
            const now = Date.now();
            const timeSinceLastRequest = now - lastRequestTime;
            
            if (timeSinceLastRequest < MIN_TIME_BETWEEN_REQUESTS) {
                const waitTime = Math.ceil((MIN_TIME_BETWEEN_REQUESTS - timeSinceLastRequest) / 1000);
                await sock.sendMessage(from, {
                    text: `⏳ *Rate Limited*\n\nPlease wait ${waitTime} seconds before using this command again.\n\nThis prevents WhatsApp from blocking the server.`
                }, { quoted: msg });
                return;
            }

            if (requestCount >= MAX_REQUESTS_PER_HOUR) {
                await sock.sendMessage(from, {
                    text: `🚫 *Daily Limit Reached*\n\nYou have reached the maximum of ${MAX_REQUESTS_PER_HOUR} profile picture downloads per hour.\n\nThis is a safety measure to prevent WhatsApp from blocking the server.`
                }, { quoted: msg });
                return;
            }

            const targetJid = msg.message.extendedTextMessage.contextInfo.participant;
            const phoneNumber = targetJid.split('@')[0];

            // Update rate limiting
            lastRequestTime = now;
            requestCount++;

            // React immediately
            await sock.sendMessage(from, {
                react: {
                    text: '📸',
                    key: msg.key
                }
            });

            // Get personal chat
            const senderJid = msg.key.participant || from;
            const yourNumber = senderJid.split('@')[0];
            const yourPersonalChat = `${yourNumber}@s.whatsapp.net`;

            console.log(`🛡️ Ultra-safe DP for: ${phoneNumber} (Request ${requestCount}/${MAX_REQUESTS_PER_HOUR})`);

            // Use ULTRA-SAFE method with maximum protection
            const result = await ultraSafeProfilePicture(sock, targetJid, phoneNumber);
            
            if (result.success) {
                await sock.sendMessage(yourPersonalChat, {
                    image: { url: result.url },
                    caption: `👤 ${phoneNumber}\n🛡️ Safe Download\n⏰ ${new Date().toLocaleTimeString()}`
                });
                
                await sock.sendMessage(from, {
                    react: {
                        text: '✅',
                        key: msg.key
                    }
                });
                
            } else {
                await sock.sendMessage(yourPersonalChat, {
                    text: `❌ *Download Failed Safely*\n\n📱 ${phoneNumber}\n\n*Safety Status:* ✅ No blocking triggered\n*Reason:* ${result.error || 'Profile not accessible'}`
                });
                
                await sock.sendMessage(from, {
                    react: {
                        text: '❌',
                        key: msg.key
                    }
                });
            }

        } catch (error) {
            console.error('Ultra-safe DP error:', error.message);
            // CRITICAL: Don't send any error messages that might trigger detection
        }
    }
};

// ULTRA-SAFE profile picture download
async function ultraSafeProfilePicture(sock, targetJid, phoneNumber) {
    return new Promise(async (resolve) => {
        try {
            console.log('🛡️ Starting ultra-safe download...');

            // METHOD 1: Single attempt with maximum safety
            try {
                console.log('🛡️ Method 1: Single safe attempt');
                
                // Critical: Add significant delay before attempting
                await delay(5000);
                
                const profilePic = await sock.profilePictureUrl(targetJid, 'image');
                
                if (profilePic && isValidImageUrl(profilePic)) {
                    console.log('✅ Ultra-safe download successful');
                    return resolve({
                        success: true,
                        url: profilePic,
                        method: 'ultra_safe',
                        safety: 'maximum'
                    });
                } else {
                    console.log('❌ No profile picture found');
                    return resolve({
                        success: false,
                        error: 'No profile picture available'
                    });
                }
                
            } catch (error) {
                console.log('🛡️ Ultra-safe method failed:', error.message);
                
                // CRITICAL: Don't retry if it fails - this triggers blocking
                return resolve({
                    success: false,
                    error: 'Profile picture not accessible due to privacy settings',
                    safety: 'protected'
                });
            }

        } catch (error) {
            console.error('🛡️ Ultra-safe system error:', error.message);
            resolve({ 
                success: false, 
                error: 'Safety system prevented download',
                safety: 'maximum_protection'
            });
        }
    });
}

// Reset request count every hour
setInterval(() => {
    requestCount = 0;
    console.log('🔄 DP request counter reset');
}, 60 * 60 * 1000); // 1 hour

// Utility functions
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (url.includes('default') || url.includes('placeholder')) return false;
    return url.startsWith('http');
}

// Emergency shutdown command
module.exports.emergency = {
    name: 'stopdp',
    description: 'Emergency stop all DP downloads',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        // Only allow bot owner to use this
        const senderJid = msg.key.participant || from;
        const senderNumber = senderJid.split('@')[0];
        const botOwnerNumber = '233539738956'; // Your number
        
        if (senderNumber !== botOwnerNumber) {
            await sock.sendMessage(from, {
                text: '❌ Emergency commands can only be used by the bot owner.'
            }, { quoted: msg });
            return;
        }

        // Reset all counters
        requestCount = MAX_REQUESTS_PER_HOUR;
        lastRequestTime = Date.now();
        
        await sock.sendMessage(from, {
            text: '🛑 *EMERGENCY STOP*\n\nAll profile picture downloads have been disabled for 1 hour.\n\nThis prevents WhatsApp from blocking the server.'
        }, { quoted: msg });
        
        console.log('🛑 EMERGENCY: DP downloads disabled by owner');
    }
};

// Status command to check safety limits
module.exports.status = {
    name: 'dpstatus',
    description: 'Check DP download status and limits',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        const remainingRequests = MAX_REQUESTS_PER_HOUR - requestCount;
        const timeUntilReset = Math.ceil((60 * 60 * 1000 - (Date.now() % (60 * 60 * 1000))) / 60000);
        
        await sock.sendMessage(from, {
            text: `📊 *DP Download Status*\n\n✅ *Safety System:* ACTIVE\n📥 *Used Today:* ${requestCount}/${MAX_REQUESTS_PER_HOUR}\n🔄 *Remaining:* ${remainingRequests} downloads\n⏰ *Reset In:* ${timeUntilReset} minutes\n\n🛡️ *Protection:* Maximum security enabled\n⚡ *Rate Limit:* 1 request per 30 seconds\n🚫 *Daily Limit:* ${MAX_REQUESTS_PER_HOUR} per hour\n\n_This prevents WhatsApp server blocking_`
        }, { quoted: msg });
    }
};

// ONE-TIME only command for critical needs
module.exports.critical = {
    name: 'criticaldp',
    description: 'One-time critical download (USE SPARINGLY)',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        // Only allow bot owner
        const senderJid = msg.key.participant || from;
        const senderNumber = senderJid.split('@')[0];
        const botOwnerNumber = '233539738956';
        
        if (senderNumber !== botOwnerNumber) {
            await sock.sendMessage(from, {
                text: '❌ Critical commands can only be used by the bot owner.'
            }, { quoted: msg });
            return;
        }

        if (!msg.message?.extendedTextMessage?.contextInfo?.participant) {
            await sock.sendMessage(from, {
                text: '❌ Reply to a message for critical download'
            }, { quoted: msg });
            return;
        }

        const targetJid = msg.message.extendedTextMessage.contextInfo.participant;
        const phoneNumber = targetJid.split('@')[0];

        await sock.sendMessage(from, {
            react: {
                text: '🚨',
                key: msg.key
            }
        });

        const yourPersonalChat = `${senderNumber}@s.whatsapp.net`;

        console.log(`🚨 CRITICAL DP for: ${phoneNumber}`);

        try {
            // Add even longer delay for critical requests
            await delay(10000); // 10 second delay
            
            const profilePic = await sock.profilePictureUrl(targetJid, 'image');
            
            if (profilePic && isValidImageUrl(profilePic)) {
                await sock.sendMessage(yourPersonalChat, {
                    image: { url: profilePic },
                    caption: `👤 ${phoneNumber}\n🚨 Critical Download\n⚠️ USE SPARINGLY`
                });
                
                await sock.sendMessage(from, {
                    react: {
                        text: '✅',
                        key: msg.key
                    }
                });
            } else {
                await sock.sendMessage(yourPersonalChat, {
                    text: `❌ Critical download failed\n📱 ${phoneNumber}\n\nEven critical access cannot bypass privacy settings.`
                });
            }
        } catch (error) {
            await sock.sendMessage(yourPersonalChat, {
                text: `🚨 CRITICAL FAILURE\n\nDownload failed. Server may be at risk of blocking.\n\nWait at least 1 hour before trying again.`
            });
        }
    }
};
