const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'profile',
    description: 'Advanced profile information system (Ethical)',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        const command = args[0]?.toLowerCase();

        try {
            switch(command) {
                case 'pic':
                    await handleProfilePic(sock, msg, args);
                    break;
                case 'info':
                    await handleProfileInfo(sock, msg, args);
                    break;
                case 'status':
                    await handleStatus(sock, msg, args);
                    break;
                case 'group':
                    await handleGroupInfo(sock, msg, args);
                    break;
                case 'backup':
                    await handleBackup(sock, msg, args);
                    break;
                default:
                    await showHelpMenu(sock, msg);
            }
        } catch (error) {
            console.error('Profile command error:', error);
            await sock.sendMessage(from, {
                text: '❌ Error: ' + error.message
            }, { quoted: msg });
        }
    }
};

// Profile Picture Handler
async function handleProfilePic(sock, msg, args) {
    const from = msg.key.remoteJid;
    const target = args[1] || from;

    await sock.sendMessage(from, {
        text: '📸 *Fetching Profile Picture*\n\nPlease wait...'
    }, { quoted: msg });

    try {
        const profilePicUrl = await sock.profilePictureUrl(target, 'image');
        
        if (profilePicUrl) {
            // Download and send with metadata
            const response = await axios.get(profilePicUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);
            
            await sock.sendMessage(from, {
                image: buffer,
                caption: `🖼️ *Profile Picture*\n\n📁 Format: ${response.headers['content-type']}\n💾 Size: ${(buffer.length / 1024).toFixed(2)} KB\n👤 User: ${target.split('@')[0]}\n\n*Note:* This only works for users in your contacts.`
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, {
                text: '❌ *No Profile Picture Found*\n\nPossible reasons:\n• User has no profile picture\n• User is not in your contacts\n• Privacy settings restrict access\n• User is in a group chat'
            }, { quoted: msg });
        }
    } catch (error) {
        await sock.sendMessage(from, {
            text: '🔒 *Privacy Restricted*\n\nWhatsApp protects profile pictures for user privacy. I can only access:\n• Your own profile picture\n• Profile pictures of users in your contacts\n• In personal chats only (not groups)'
        }, { quoted: msg });
    }
}

// Profile Information Handler
async function handleProfileInfo(sock, msg, args) {
    const from = msg.key.remoteJid;
    let target = args[1] || from;

    // If it's a group, get info about the quoted user or sender
    if (from.includes('@g.us')) {
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.participant;
        target = quotedMsg || msg.key.participant || from;
    }

    try {
        const contact = await sock.getContact(target);
        
        let profileInfo = `👤 *Profile Information*\n\n`;
        profileInfo += `📱 Number: ${contact.id.user}\n`;
        profileInfo += `📛 Name: ${contact.name || contact.pushname || 'Not available'}\n`;
        profileInfo += `ℹ️ Short Name: ${contact.shortName || 'Not available'}\n`;
        
        if (contact.verifiedName) {
            profileInfo += `✅ Verified Name: ${contact.verifiedName}\n`;
        }
        
        // Try to get profile picture
        try {
            const picUrl = await sock.profilePictureUrl(target, 'image');
            profileInfo += `🖼️ Has Profile Pic: ${picUrl ? 'Yes ✅' : 'No ❌'}\n`;
        } catch {
            profileInfo += `🖼️ Has Profile Pic: Unknown (Privacy) 🔒\n`;
        }

        profileInfo += `\n📊 *Chat Info:*\n`;
        profileInfo += `💬 Is User: ${contact.isUser ? 'Yes' : 'No'}\n`;
        profileInfo += `🏢 Is Business: ${contact.isBusiness ? 'Yes' : 'No'}\n`;
        profileInfo += `👥 Is Group: ${contact.isGroup ? 'Yes' : 'No'}\n`;
        
        profileInfo += `\n⏰ Last Updated: ${new Date().toLocaleString()}`;

        await sock.sendMessage(from, {
            text: profileInfo
        }, { quoted: msg });

    } catch (error) {
        await sock.sendMessage(from, {
            text: '❌ *Unable to fetch profile information*\n\nThis may be due to privacy settings or the user not being in your contacts.'
        }, { quoted: msg });
    }
}

// Status Handler
async function handleStatus(sock, msg, args) {
    const from = msg.key.remoteJid;

    try {
        // Note: This only works for your own status or if user is in contacts
        const status = await sock.fetchStatus(from);
        
        if (status && status.status) {
            await sock.sendMessage(from, {
                text: `📝 *Status Information*\n\n💬 Status: ${status.status}\n⏰ Set At: ${new Date(status.setAt).toLocaleString()}\n\n*Note:* I can only view status of users in your contacts.`
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, {
                text: '❌ *No Status Found*\n\nEither the user has no status or privacy settings prevent viewing it.'
            }, { quoted: msg });
        }
    } catch (error) {
        await sock.sendMessage(from, {
            text: '🔒 *Status Access Restricted*\n\nWhatsApp protects status updates for privacy. I can only view status of users in your contacts.'
        }, { quoted: msg });
    }
}

// Group Information Handler
async function handleGroupInfo(sock, msg, args) {
    const from = msg.key.remoteJid;

    if (!from.includes('@g.us')) {
        await sock.sendMessage(from, {
            text: '❌ This command only works in group chats.'
        }, { quoted: msg });
        return;
    }

    try {
        const groupMetadata = await sock.groupMetadata(from);
        const participants = groupMetadata.participants;
        
        let groupInfo = `👥 *Group Information*\n\n`;
        groupInfo += `📛 Group Name: ${groupMetadata.subject}\n`;
        groupInfo += `👑 Created By: ${groupMetadata.owner || 'Unknown'}\n`;
        groupInfo += `📅 Created: ${new Date(groupMetadata.creation * 1000).toLocaleString()}\n`;
        groupInfo += `👥 Participants: ${participants.length} members\n`;
        groupInfo += `🔒 Group Type: ${groupMetadata.restrict ? 'Restricted' : 'Open'}\n`;
        groupInfo += `📢 Announcement: ${groupMetadata.announce ? 'Enabled' : 'Disabled'}\n`;
        
        groupInfo += `\n🛡️ *Your Role:* ${participants.find(p => p.id === msg.key.participant)?.admin || 'Member'}`;
        
        groupInfo += `\n\n📊 *Admin Count:* ${participants.filter(p => p.admin).length}`;
        groupInfo += `\n👤 *Member Count:* ${participants.filter(p => !p.admin).length}`;

        await sock.sendMessage(from, {
            text: groupInfo
        }, { quoted: msg });

    } catch (error) {
        await sock.sendMessage(from, {
            text: '❌ Unable to fetch group information.'
        }, { quoted: msg });
    }
}

// Backup Contact Info (Ethical - Only your own)
async function handleBackup(sock, msg, args) {
    const from = msg.key.remoteJid;

    try {
        await sock.sendMessage(from, {
            text: '📦 *Creating Contact Backup*\n\nThis will backup information about your contacts...'
        }, { quoted: msg });

        // Get all chats to find contacts
        const chats = await sock.chats.all();
        const contacts = [];
        
        for (let chat of chats.slice(0, 50)) { // Limit to first 50 for performance
            if (chat.id.includes('@s.whatsapp.net')) {
                try {
                    const contact = await sock.getContact(chat.id);
                    contacts.push({
                        number: contact.id.user,
                        name: contact.name || contact.pushname,
                        shortName: contact.shortName
                    });
                } catch (error) {
                    // Skip contacts that can't be accessed
                }
            }
        }

        let backupText = `📋 *Contact Backup* - ${new Date().toLocaleString()}\n\n`;
        backupText += `Total Contacts: ${contacts.length}\n\n`;
        
        contacts.forEach((contact, index) => {
            backupText += `${index + 1}. ${contact.name} (${contact.number})\n`;
        });

        backupText += `\n💾 *Backup completed*\nThis only includes basic contact information that you already have access to.`;

        await sock.sendMessage(from, {
            text: backupText
        }, { quoted: msg });

    } catch (error) {
        await sock.sendMessage(from, {
            text: '❌ Error creating backup. This feature may not be available.'
        }, { quoted: msg });
    }
}

// Help Menu
async function showHelpMenu(sock, msg) {
    const from = msg.key.remoteJid;
    
    const helpText = `🛠️ *Advanced Profile Commands*\n\n` +
        `*.profile pic* [number] - Get profile picture (contacts only)\n` +
        `*.profile info* [number] - Get profile information\n` +
        `*.profile status* - View status (contacts only)\n` +
        `*.profile group* - Get group information\n` +
        `*.profile backup* - Backup your contacts (basic info)\n\n` +
        `📝 *Examples:*\n` +
        `.profile pic\n` +
        `.profile info 1234567890\n` +
        `.profile group\n\n` +
        `🔒 *Privacy Note:* All commands respect WhatsApp's privacy policies and only access information you're authorized to see.`;

    await sock.sendMessage(from, {
        text: helpText
    }, { quoted: msg });
}

// Utility function to check if user is contact
async function isUserInContacts(sock, jid) {
    try {
        await sock.getContact(jid);
        return true;
    } catch {
        return false;
    }
}

// Utility function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
