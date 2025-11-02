const axios = require('axios');

module.exports = {
    name: 'dp',
    description: 'Download actual WhatsApp profile picture',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            let targetJid = null;
            let phoneNumber = args[0];

            // If replying to a message, get that user's JID
            if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                targetJid = msg.message.extendedTextMessage.contextInfo.participant;
                phoneNumber = targetJid.split('@')[0];
            } else if (!phoneNumber) {
                await sock.sendMessage(from, {
                    text: 'Reply to a message with .dp or use .dp <number>'
                }, { quoted: msg });
                return;
            }

            // Clean phone number
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            if (phoneNumber.length < 10) {
                await sock.sendMessage(from, { text: 'Invalid number' }, { quoted: msg });
                return;
            }

            // Send "Saved" immediately
            await sock.sendMessage(from, { text: 'Saved ✓' }, { quoted: msg });

            // Get sender's personal chat
            const senderJid = msg.key.participant || from;
            const personalJid = senderJid.includes('@g.us') ? 
                senderJid.split('@')[0] + '@s.whatsapp.net' : 
                senderJid;

            // Use the target JID if we have it from reply, otherwise create from phone number
            const userJid = targetJid || `${phoneNumber}@s.whatsapp.net`;

            // METHOD 1: Direct WhatsApp profile picture access (only works for contacts)
            try {
                console.log(`Trying direct profile picture for: ${userJid}`);
                const profilePicUrl = await sock.profilePictureUrl(userJid, 'image');
                
                if (profilePicUrl) {
                    console.log(`Direct profile picture found: ${profilePicUrl}`);
                    await sock.sendMessage(personalJid, {
                        image: { url: profilePicUrl },
                        caption: `👤 ${phoneNumber}\n✅ Actual Profile Picture`
                    });
                    return;
                }
            } catch (error) {
                console.log('Direct method failed:', error.message);
            }

            // METHOD 2: If direct access fails, try to get contact info first
            try {
                console.log(`Trying to get contact for: ${userJid}`);
                const contact = await sock.getContact(userJid);
                
                if (contact) {
                    console.log('Contact found, trying profile picture again...');
                    try {
                        const profilePicUrl = await sock.profilePictureUrl(userJid, 'image');
                        if (profilePicUrl) {
                            await sock.sendMessage(personalJid, {
                                image: { url: profilePicUrl },
                                caption: `👤 ${contact.name || phoneNumber}\n✅ Contact Profile Picture`
                            });
                            return;
                        }
                    } catch (error) {
                        console.log('Second attempt failed:', error.message);
                    }
                }
            } catch (error) {
                console.log('Contact method failed:', error.message);
            }

            // METHOD 3: If both above fail, use the WhatsApp bot's internal method
            try {
                console.log('Trying internal profile picture method...');
                const profilePicBuffer = await getProfilePictureInternal(sock, userJid);
                
                if (profilePicBuffer) {
                    await sock.sendMessage(personalJid, {
                        image: profilePicBuffer,
                        caption: `👤 ${phoneNumber}\n✅ Profile Picture`
                    });
                    return;
                }
            } catch (error) {
                console.log('Internal method failed:', error.message);
            }

            // METHOD 4: Final fallback - check if user is in any groups together
            try {
                console.log('Trying group presence method...');
                const groupPicUrl = await findUserInGroups(sock, userJid, personalJid);
                if (groupPicUrl) {
                    await sock.sendMessage(personalJid, {
                        image: { url: groupPicUrl },
                        caption: `👤 ${phoneNumber}\n✅ From Group`
                    });
                    return;
                }
            } catch (error) {
                console.log('Group method failed:', error.message);
            }

            // If all methods fail
            await sock.sendMessage(personalJid, {
                text: `❌ Cannot access profile picture for ${phoneNumber}\n\nUser may have:\n• No profile picture\n• Privacy settings enabled\n• Or not be in your contacts`
            });

        } catch (error) {
            console.error('DP command error:', error);
        }
    }
};

// Internal method to get profile picture
async function getProfilePictureInternal(sock, jid) {
    try {
        // Try to update profile picture info first
        await sock.updateProfilePicture(jid);
        
        // Then try to get the picture
        const profilePicUrl = await sock.profilePictureUrl(jid, 'image');
        return profilePicUrl;
    } catch (error) {
        throw new Error('Internal method failed');
    }
}

// Method to find user in shared groups
async function findUserInGroups(sock, targetJid, myJid) {
    try {
        const chats = await sock.groupFetchAllParticipating();
        
        for (const groupId in chats) {
            const group = chats[groupId];
            const participants = group.participants || [];
            
            // Check if both me and target are in this group
            const imInGroup = participants.find(p => p.id === myJid);
            const targetInGroup = participants.find(p => p.id === targetJid);
            
            if (imInGroup && targetInGroup) {
                try {
                    const groupPicUrl = await sock.profilePictureUrl(groupId, 'image');
                    if (groupPicUrl) {
                        return groupPicUrl;
                    }
                } catch (error) {
                    continue;
                }
            }
        }
        return null;
    } catch (error) {
        throw new Error('Group search failed');
    }
}

// Enhanced version that works better for contacts
module.exports.advanced = {
    name: 'getdp',
    description: 'Advanced profile picture download',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            let targetJid = null;
            let phoneNumber = args[0];

            // Get target from reply
            if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                targetJid = msg.message.extendedTextMessage.contextInfo.participant;
                phoneNumber = targetJid.split('@')[0];
            } else if (!phoneNumber) {
                await sock.sendMessage(from, { 
                    text: 'Reply to message with .getdp or use .getdp <number>' 
                }, { quoted: msg });
                return;
            }

            // Clean number
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            if (phoneNumber.length < 10) {
                await sock.sendMessage(from, { text: 'Invalid number' }, { quoted: msg });
                return;
            }

            // Send confirmation
            await sock.sendMessage(from, { text: 'Saved ✓' }, { quoted: msg });

            // Get personal chat
            const senderJid = msg.key.participant || from;
            const personalJid = senderJid.includes('@g.us') ? 
                senderJid.split('@')[0] + '@s.whatsapp.net' : 
                senderJid;

            const userJid = targetJid || `${phoneNumber}@s.whatsapp.net`;

            // Try multiple methods sequentially
            const methods = [
                () => tryDirectProfilePicture(sock, userJid),
                () => tryWithContactUpdate(sock, userJid),
                () => tryGroupMethod(sock, userJid, personalJid)
            ];

            for (const method of methods) {
                try {
                    const result = await method();
                    if (result && result.success) {
                        await sock.sendMessage(personalJid, {
                            image: { url: result.url },
                            caption: `👤 ${phoneNumber}\n✅ ${result.type}`
                        });
                        return;
                    }
                } catch (error) {
                    continue;
                }
            }

            // Final fallback - try to send contact card which might trigger profile update
            try {
                await sock.sendMessage(personalJid, {
                    contact: {
                        displayName: `Profile ${phoneNumber}`,
                        contacts: [{ 
                            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${phoneNumber}\nTEL:${phoneNumber}\nEND:VCARD` 
                        }]
                    }
                });
                
                // Wait a bit and try again
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const finalTry = await tryDirectProfilePicture(sock, userJid);
                if (finalTry && finalTry.success) {
                    await sock.sendMessage(personalJid, {
                        image: { url: finalTry.url },
                        caption: `👤 ${phoneNumber}\n✅ Retrieved`
                    });
                    return;
                }
            } catch (error) {
                // Ignore
            }

            await sock.sendMessage(personalJid, {
                text: `❌ No profile picture available for ${phoneNumber}`
            });

        } catch (error) {
            console.error('Advanced DP error:', error);
        }
    }
};

async function tryDirectProfilePicture(sock, jid) {
    try {
        const url = await sock.profilePictureUrl(jid, 'image');
        return url ? { success: true, url: url, type: 'Direct' } : null;
    } catch (error) {
        throw new Error('Direct failed');
    }
}

async function tryWithContactUpdate(sock, jid) {
    try {
        // Try to refresh contact info
        await sock.getContact(jid);
        const url = await sock.profilePictureUrl(jid, 'image');
        return url ? { success: true, url: url, type: 'Updated' } : null;
    } catch (error) {
        throw new Error('Contact update failed');
    }
}

async function tryGroupMethod(sock, targetJid, myJid) {
    try {
        const url = await findUserInGroups(sock, targetJid, myJid);
        return url ? { success: true, url: url, type: 'Group' } : null;
    } catch (error) {
        throw new Error('Group method failed');
    }
}

// Simple version that only works for existing contacts
module.exports.simple = {
    name: 'pdp', 
    description: 'Simple profile picture for contacts',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            let targetJid = null;

            // Must be replying to a message
            if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                targetJid = msg.message.extendedTextMessage.contextInfo.participant;
            } else {
                await sock.sendMessage(from, { 
                    text: 'Reply to a message with .pdp to get profile picture' 
                }, { quoted: msg });
                return;
            }

            const phoneNumber = targetJid.split('@')[0];

            // Send confirmation
            await sock.sendMessage(from, { text: 'Saved ✓' }, { quoted: msg });

            // Get personal chat
            const senderJid = msg.key.participant || from;
            const personalJid = senderJid.includes('@g.us') ? 
                senderJid.split('@')[0] + '@s.whatsapp.net' : 
                senderJid;

            // Direct method only
            try {
                const profilePicUrl = await sock.profilePictureUrl(targetJid, 'image');
                if (profilePicUrl) {
                    await sock.sendMessage(personalJid, {
                        image: { url: profilePicUrl },
                        caption: `👤 ${phoneNumber}`
                    });
                } else {
                    await sock.sendMessage(personalJid, {
                        text: `❌ No profile picture for ${phoneNumber}`
                    });
                }
            } catch (error) {
                await sock.sendMessage(personalJid, {
                    text: `❌ Cannot access ${phoneNumber}'s profile picture`
                });
            }

        } catch (error) {
            console.error('Simple DP error:', error);
        }
    }
};
