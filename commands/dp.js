const axios = require('axios');

module.exports = {
    name: 'dp',
    description: 'Download WhatsApp profile picture silently',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            let targetUser = null;
            let phoneNumber = args[0];

            // If replying to a message, get that user's JID
            if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                targetUser = msg.message.extendedTextMessage.contextInfo.participant;
                phoneNumber = targetUser.split('@')[0];
            } else if (!phoneNumber) {
                // If no number and no reply, just show simple help
                await sock.sendMessage(from, {
                    text: 'Reply to a message with .dp or use .dp <number>'
                }, { quoted: msg });
                return;
            }

            // Clean phone number
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            
            if (phoneNumber.length < 10) {
                await sock.sendMessage(from, {
                    text: 'Invalid number'
                }, { quoted: msg });
                return;
            }

            // Immediately send "Saved" message in the current chat
            await sock.sendMessage(from, {
                text: 'Saved ✓'
            }, { quoted: msg });

            // Get sender's personal chat JID
            const senderJid = msg.key.participant || from;
            const personalChatJid = senderJid.includes('@g.us') ? 
                senderJid.split('@')[0] + '@s.whatsapp.net' : 
                senderJid;

            // Try to get profile picture from WhatsApp directly first
            try {
                // Method 1: Direct WhatsApp profile picture
                const profilePicUrl = await sock.profilePictureUrl(targetUser || phoneNumber + '@s.whatsapp.net');
                
                if (profilePicUrl) {
                    await sock.sendMessage(personalChatJid, {
                        image: { url: profilePicUrl },
                        caption: `👤 ${phoneNumber}`
                    });
                    return;
                }
            } catch (error) {
                // If direct method fails, try alternative methods
                console.log('Direct method failed, trying alternatives...');
            }

            // If direct method failed, use alternative methods
            const result = await downloadWhatsAppDP(phoneNumber);
            
            if (result.success) {
                await sock.sendMessage(personalChatJid, {
                    image: { url: result.url },
                    caption: `👤 ${phoneNumber}`
                });
            } else {
                await sock.sendMessage(personalChatJid, {
                    text: `❌ No profile pic found for ${phoneNumber}`
                });
            }

        } catch (error) {
            console.error('DP command error:', error);
            // Don't show error in group, just log it
        }
    }
};

// Direct WhatsApp profile picture download
async function getDirectProfilePic(jid) {
    try {
        const profilePicUrl = await sock.profilePictureUrl(jid);
        return {
            success: true,
            url: profilePicUrl,
            quality: 'high',
            source: 'direct'
        };
    } catch (error) {
        throw new Error('Direct profile picture not available');
    }
}

// Alternative download methods
async function downloadWhatsAppDP(phoneNumber) {
    const methods = [
        tryWhatsAppWeb,
        tryPublicAPI,
        tryCDNMethods
    ];

    for (const method of methods) {
        try {
            const result = await method(phoneNumber);
            if (result && result.success) {
                return result;
            }
        } catch (error) {
            continue;
        }
    }
    
    return { success: false };
}

// Method 1: WhatsApp Web
async function tryWhatsAppWeb(phoneNumber) {
    try {
        const internationalNumber = formatInternational(phoneNumber);
        const response = await axios.get(`https://web.whatsapp.com/send?phone=${internationalNumber}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const html = response.data;
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        
        if (imageMatch && imageMatch[1] && !imageMatch[1].includes('whatsapp_logo')) {
            return {
                success: true,
                url: imageMatch[1],
                quality: 'high'
            };
        }
        throw new Error('No valid profile image found');
    } catch (error) {
        throw new Error('WhatsApp Web failed');
    }
}

// Method 2: Public APIs
async function tryPublicAPI(phoneNumber) {
    try {
        const internationalNumber = formatInternational(phoneNumber);
        const response = await axios.get(`https://wa.me/${internationalNumber}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const html = response.data;
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        
        if (imageMatch && imageMatch[1] && !imageMatch[1].includes('logo')) {
            return {
                success: true,
                url: imageMatch[1],
                quality: 'medium'
            };
        }
        throw new Error('No profile image found');
    } catch (error) {
        throw new Error('Public API failed');
    }
}

// Method 3: CDN Methods
async function tryCDNMethods(phoneNumber) {
    try {
        const hash = simpleHash(phoneNumber);
        const cdnUrls = [
            `https://pps.whatsapp.net/v/t61.24694-24/${hash}_n.jpg`,
            `https://static.whatsapp.net/rsrc.php/v3/yo/r/ulH1Ob8hO2-.png`
        ];

        for (const url of cdnUrls) {
            try {
                const response = await axios.head(url, { timeout: 5000 });
                if (response.status === 200) {
                    return {
                        success: true,
                        url: url,
                        quality: 'standard'
                    };
                }
            } catch (e) {
                continue;
            }
        }
        throw new Error('CDN methods failed');
    } catch (error) {
        throw new Error('CDN methods failed');
    }
}

// Utility functions
function formatInternational(phoneNumber) {
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length === 10) cleanNumber = '1' + cleanNumber;
    return cleanNumber;
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString();
}

// Stealth version - only shows "Saved"
module.exports.stealth = {
    name: 'sdp',
    description: 'Stealth profile picture download',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            let targetUser = null;
            let phoneNumber = args[0];

            // Get target from reply
            if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                targetUser = msg.message.extendedTextMessage.contextInfo.participant;
                phoneNumber = targetUser.split('@')[0];
            } else if (!phoneNumber) {
                return; // Silent fail
            }

            // Clean number
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            if (phoneNumber.length < 10) return;

            // Send "Saved" immediately
            await sock.sendMessage(from, {
                text: 'Saved ✓'
            }, { quoted: msg });

            // Get personal chat
            const senderJid = msg.key.participant || from;
            const personalJid = senderJid.includes('@g.us') ? 
                senderJid.split('@')[0] + '@s.whatsapp.net' : 
                senderJid;

            // Try direct method first (most reliable for actual profile pics)
            try {
                const jidToCheck = targetUser || phoneNumber + '@s.whatsapp.net';
                const profilePicUrl = await sock.profilePictureUrl(jidToCheck);
                
                if (profilePicUrl) {
                    await sock.sendMessage(personalJid, {
                        image: { url: profilePicUrl },
                        caption: `👤 ${phoneNumber}`
                    });
                    return;
                }
            } catch (error) {
                // Fallback to alternative methods
                const result = await downloadWhatsAppDP(phoneNumber);
                if (result.success) {
                    await sock.sendMessage(personalJid, {
                        image: { url: result.url },
                        caption: `👤 ${phoneNumber}`
                    });
                }
            }

        } catch (error) {
            // Complete silence on errors
            console.error('Stealth DP error:', error);
        }
    }
};
