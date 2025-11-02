const axios = require('axios');

module.exports = {
    name: 'dp',
    description: 'Download WhatsApp profile picture to your personal chat',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            let targetUser = null;
            let phoneNumber = args[0];

            // If replying to a message, get that user
            if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                targetUser = msg.message.extendedTextMessage.contextInfo.participant;
            } else if (!phoneNumber) {
                // If no number provided and not replying, show help
                await sock.sendMessage(from, {
                    text: '📸 *Profile Picture Download*\n\nReply to someone\'s message with *.dp* or use:\n.dp <phone-number>\n\nExample: .dp 1234567890'
                }, { quoted: msg });
                return;
            }

            // If targetUser is set from reply, use that
            if (targetUser) {
                phoneNumber = targetUser.split('@')[0];
            }

            // Clean phone number
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            
            if (phoneNumber.length < 10) {
                await sock.sendMessage(from, {
                    text: '❌ Please provide a valid phone number\nExample: .dp 1234567890'
                }, { quoted: msg });
                return;
            }

            // Send processing message in original chat
            await sock.sendMessage(from, {
                text: '📸 Searching for profile picture...\n✅ It will be sent to your personal chat.'
            }, { quoted: msg });

            const result = await downloadWhatsAppDP(phoneNumber);
            
            // Get the personal chat JID of the command sender
            const senderJid = msg.key.participant || msg.key.remoteJid;
            const personalChatJid = senderJid.includes('-') ? senderJid.split('@')[0] + '@s.whatsapp.net' : senderJid;

            if (result.success) {
                // Send to personal chat
                await sock.sendMessage(personalChatJid, {
                    image: { url: result.url },
                    caption: `👤 WhatsApp Profile Picture\n📱 Number: ${phoneNumber}\n🕒 ${new Date().toLocaleString()}`
                });

                // Confirm in original chat
                await sock.sendMessage(from, {
                    text: `✅ Profile picture sent to your personal chat!`
                }, { quoted: msg });

            } else {
                // Send error to personal chat
                await sock.sendMessage(personalChatJid, {
                    text: `❌ Profile picture not found for ${phoneNumber}\n\nPossible reasons:\n• Number not on WhatsApp\n• Profile picture is private\n• Number not in public databases`
                });

                // Confirm in original chat
                await sock.sendMessage(from, {
                    text: `❌ Profile picture not found. Check your personal chat for details.`
                }, { quoted: msg });
            }

        } catch (error) {
            console.error('DP command error:', error);
            await sock.sendMessage(from, {
                text: '❌ Error fetching profile picture. Please try again.'
            }, { quoted: msg });
        }
    }
};

// Enhanced version with better targeting
module.exports.advanced = {
    name: 'getdp',
    description: 'Get profile picture with advanced options',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            let targetUser = null;
            let phoneNumber = args[0];

            // Check if replying to a message
            const isReply = msg.message?.extendedTextMessage?.contextInfo;
            
            if (isReply) {
                targetUser = msg.message.extendedTextMessage.contextInfo.participant;
                phoneNumber = targetUser.split('@')[0];
            } else if (!phoneNumber && from.includes('@g.us')) {
                // In group but no reply and no number
                await sock.sendMessage(from, {
                    text: '📸 *Usage:*\n\nReply to someone\'s message with *.getdp* OR\n.getdp <phone-number>\n\n✅ The profile picture will be sent to your personal chat privately.'
                }, { quoted: msg });
                return;
            } else if (!phoneNumber) {
                // Personal chat, use current chat
                phoneNumber = from.split('@')[0];
            }

            // Clean phone number
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            
            if (phoneNumber.length < 10) {
                await sock.sendMessage(from, {
                    text: '❌ Invalid phone number format\nUse: .getdp 1234567890'
                }, { quoted: msg });
                return;
            }

            // Get sender's personal chat JID
            const senderJid = msg.key.participant || from;
            const personalJid = senderJid.includes('-') ? 
                senderJid.split('@')[0] + '@s.whatsapp.net' : 
                senderJid;

            // Notify in original chat
            await sock.sendMessage(from, {
                text: `🔍 Searching profile picture for ${phoneNumber}...\n📱 Check your personal messages.`
            }, { quoted: msg });

            // Download profile picture
            const result = await downloadWhatsAppDP(phoneNumber);
            
            if (result.success) {
                // Send to personal chat with details
                await sock.sendMessage(personalJid, {
                    image: { url: result.url },
                    caption: `👤 *Profile Picture Found*\n\n📱 Number: ${phoneNumber}\n🎯 Quality: ${result.quality || 'Standard'}\n📅 Date: ${new Date().toLocaleString()}\n\n💡 *Source:* Public WhatsApp API`
                });

                // Success confirmation in original chat
                await sock.sendMessage(from, {
                    text: `✅ Success! Profile picture sent to your personal chat.`
                }, { quoted: msg });

            } else {
                // Send error to personal chat
                await sock.sendMessage(personalJid, {
                    text: `❌ *Profile Picture Not Available*\n\n📱 Number: ${phoneNumber}\n\n🚫 *Possible Reasons:*\n• User not on WhatsApp\n• Private profile picture\n• Number not in database\n• Temporary service issue\n\n🔄 Try again later or with a different number.`
                });

                // Error confirmation in original chat
                await sock.sendMessage(from, {
                    text: `❌ Profile picture not available. Details sent to your personal chat.`
                }, { quoted: msg });
            }

        } catch (error) {
            console.error('GetDP command error:', error);
            
            const senderJid = msg.key.participant || msg.key.remoteJid;
            const personalJid = senderJid.includes('-') ? 
                senderJid.split('@')[0] + '@s.whatsapp.net' : 
                senderJid;

            await sock.sendMessage(personalJid, {
                text: `❌ *Download Failed*\n\nError: ${error.message}\n\nPlease try again later.`
            });

            await sock.sendMessage(from, {
                text: '❌ Download failed. Check your personal chat for error details.'
            }, { quoted: msg });
        }
    }
};

// Stealth version - only sends to personal chat, no group notification
module.exports.stealth = {
    name: 'sdp',
    description: 'Stealth profile picture download',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            let targetUser = null;
            let phoneNumber = args[0];

            // Get target from reply or args
            if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                targetUser = msg.message.extendedTextMessage.contextInfo.participant;
                phoneNumber = targetUser.split('@')[0];
            } else if (!phoneNumber) {
                return; // Silent fail for stealth
            }

            // Clean phone number
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            if (phoneNumber.length < 10) return;

            // Get sender's personal JID
            const senderJid = msg.key.participant || from;
            const personalJid = senderJid.includes('-') ? 
                senderJid.split('@')[0] + '@s.whatsapp.net' : 
                senderJid;

            // Download silently
            const result = await downloadWhatsAppDP(phoneNumber);
            
            if (result.success) {
                await sock.sendMessage(personalJid, {
                    image: { url: result.url },
                    caption: `👤 ${phoneNumber}\n🕒 ${new Date().toLocaleTimeString()}`
                });
            } else {
                await sock.sendMessage(personalJid, {
                    text: `❌ No DP found for ${phoneNumber}`
                });
            }

            // Delete the command message for true stealth (if possible)
            try {
                await sock.sendMessage(from, {
                    delete: msg.key
                });
            } catch (e) {
                // Ignore if can't delete
            }

        } catch (error) {
            // Silent fail for stealth
            console.error('Stealth DP error:', error);
        }
    }
};

// Keep the same download function as before
async function downloadWhatsAppDP(phoneNumber) {
    const methods = [
        tryWhatsAppDPApi,
        tryWebScrapingMethod,
        tryPublicApi,
        tryAlternativeService
    ];

    for (const method of methods) {
        try {
            console.log(`Trying method: ${method.name}`);
            const result = await method(phoneNumber);
            if (result && result.success) {
                console.log(`Success with ${method.name}`);
                return result;
            }
        } catch (error) {
            console.log(`${method.name} failed:`, error.message);
            continue;
        }
    }
    
    return {
        success: false,
        error: 'All methods failed'
    };
}

// ... (keep all the same download methods: tryWhatsAppDPApi, tryWebScrapingMethod, etc.)
// ... (keep the same utility functions: formatInternational, etc.)

async function tryWhatsAppDPApi(phoneNumber) {
    try {
        const internationalNumber = formatInternational(phoneNumber);
        
        const response = await axios.get(`https://api.whatsapp.com/s?phone=${internationalNumber}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            timeout: 15000
        });

        const html = response.data;
        
        const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        if (ogImageMatch && ogImageMatch[1]) {
            return {
                success: true,
                url: ogImageMatch[1],
                quality: 'high'
            };
        }

        throw new Error('No profile image found');
    } catch (error) {
        throw new Error('WhatsApp API failed');
    }
}

// ... (include all the other download methods from previous code)

function formatInternational(phoneNumber) {
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    
    if (!cleanNumber.startsWith('1') && !cleanNumber.startsWith('2') && 
        !cleanNumber.startsWith('3') && !cleanNumber.startsWith('4') && 
        !cleanNumber.startsWith('5') && !cleanNumber.startsWith('6') && 
        !cleanNumber.startsWith('7') && !cleanNumber.startsWith('8') && 
        !cleanNumber.startsWith('9')) {
        
        cleanNumber = '1' + cleanNumber;
    }
    
    return cleanNumber;
}
