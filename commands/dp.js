const axios = require('axios');

module.exports = {
    name: 'dp',
    description: 'Download WhatsApp profile picture',
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

            console.log(`Attempting to get profile picture for: ${userJid}`);

            // METHOD 1: Direct profile picture using correct Baileys method
            try {
                console.log('Trying method 1: Direct profile picture...');
                const profilePic = await sock.profilePictureUrl(userJid, 'image');
                
                if (profilePic) {
                    console.log('✅ Direct profile picture found!');
                    await sock.sendMessage(personalJid, {
                        image: { url: profilePic },
                        caption: `👤 ${phoneNumber}\n✅ Profile Picture`
                    });
                    return;
                } else {
                    console.log('❌ No profile picture found');
                    throw new Error('No profile picture');
                }
            } catch (error) {
                console.log('Method 1 failed:', error.message);
            }

            // METHOD 2: Try with preview type
            try {
                console.log('Trying method 2: Preview image...');
                const previewPic = await sock.profilePictureUrl(userJid, 'preview');
                
                if (previewPic) {
                    console.log('✅ Preview image found!');
                    await sock.sendMessage(personalJid, {
                        image: { url: previewPic },
                        caption: `👤 ${phoneNumber}\n✅ Preview Image`
                    });
                    return;
                }
            } catch (error) {
                console.log('Method 2 failed:', error.message);
            }

            // METHOD 3: Try to update presence and retry
            try {
                console.log('Trying method 3: Presence update...');
                
                // Send a presence update to the user
                await sock.sendPresenceUpdate('available', userJid);
                
                // Wait a moment
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Try again
                const retryPic = await sock.profilePictureUrl(userJid, 'image');
                if (retryPic) {
                    console.log('✅ Profile picture after presence update!');
                    await sock.sendMessage(personalJid, {
                        image: { url: retryPic },
                        caption: `👤 ${phoneNumber}\n✅ Profile Picture`
                    });
                    return;
                }
            } catch (error) {
                console.log('Method 3 failed:', error.message);
            }

            // METHOD 4: Try group participant method
            try {
                console.log('Trying method 4: Group participant lookup...');
                
                if (from.includes('@g.us')) {
                    // We're in a group, try to get participant's profile
                    const groupMetadata = await sock.groupMetadata(from);
                    const participant = groupMetadata.participants.find(p => p.id === userJid);
                    
                    if (participant) {
                        const participantPic = await sock.profilePictureUrl(userJid, 'image');
                        if (participantPic) {
                            console.log('✅ Group participant profile found!');
                            await sock.sendMessage(personalJid, {
                                image: { url: participantPic },
                                caption: `👤 ${phoneNumber}\n✅ Group Member`
                            });
                            return;
                        }
                    }
                }
            } catch (error) {
                console.log('Method 4 failed:', error.message);
            }

            // METHOD 5: Try chat presence method
            try {
                console.log('Trying method 5: Chat presence...');
                
                // Update chat presence
                await sock.sendPresenceUpdate('composing', userJid);
                await new Promise(resolve => setTimeout(resolve, 500));
                await sock.sendPresenceUpdate('paused', userJid);
                
                // Wait and retry
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const finalPic = await sock.profilePictureUrl(userJid, 'image');
                if (finalPic) {
                    console.log('✅ Profile picture after chat presence!');
                    await sock.sendMessage(personalJid, {
                        image: { url: finalPic },
                        caption: `👤 ${phoneNumber}\n✅ Profile Picture`
                    });
                    return;
                }
            } catch (error) {
                console.log('Method 5 failed:', error.message);
            }

            // METHOD 6: Last resort - try to create a chat and get profile
            try {
                console.log('Trying method 6: Chat creation...');
                
                // Send a blank message to potentially create chat
                await sock.sendMessage(userJid, { 
                    text: ' ' 
                });
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const lastResortPic = await sock.profilePictureUrl(userJid, 'image');
                if (lastResortPic) {
                    console.log('✅ Profile picture after chat creation!');
                    await sock.sendMessage(personalJid, {
                        image: { url: lastResortPic },
                        caption: `👤 ${phoneNumber}\n✅ Profile Picture`
                    });
                    return;
                }
            } catch (error) {
                console.log('Method 6 failed:', error.message);
            }

            // If all methods fail
            console.log('All methods failed, sending error message');
            await sock.sendMessage(personalJid, {
                text: `❌ Cannot access profile picture for ${phoneNumber}\n\nPossible reasons:\n• User has no profile picture\n• User has privacy settings enabled\n• User is not in your contacts\n• User account doesn't exist`
            });

        } catch (error) {
            console.error('DP command error:', error);
        }
    }
};

// Enhanced version with better error handling
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

            console.log(`Advanced DP for: ${userJid}`);

            // Try multiple quality levels
            const qualityLevels = ['image', 'preview'];
            
            for (const quality of qualityLevels) {
                try {
                    console.log(`Trying quality: ${quality}`);
                    const profilePic = await sock.profilePictureUrl(userJid, quality);
                    
                    if (profilePic) {
                        console.log(`✅ Success with ${quality} quality`);
                        await sock.sendMessage(personalJid, {
                            image: { url: profilePic },
                            caption: `👤 ${phoneNumber}\n✅ ${quality === 'image' ? 'High Quality' : 'Preview'}`
                        });
                        return;
                    }
                } catch (error) {
                    console.log(`Failed with ${quality}:`, error.message);
                    continue;
                }
            }

            // If no profile picture found, try to get user info
            try {
                console.log('Trying to get user status...');
                await sock.updateProfilePicture(userJid);
                
                // Final attempt after update
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const finalAttempt = await sock.profilePictureUrl(userJid, 'image');
                if (finalAttempt) {
                    await sock.sendMessage(personalJid, {
                        image: { url: finalAttempt },
                        caption: `👤 ${phoneNumber}\n✅ Retrieved`
                    });
                    return;
                }
            } catch (error) {
                console.log('Status update failed:', error.message);
            }

            await sock.sendMessage(personalJid, {
                text: `❌ No profile picture available for ${phoneNumber}\n\nThis user either:\n• Has no profile picture set\n• Has strict privacy settings\n• Is not in your contacts`
            });

        } catch (error) {
            console.error('Advanced DP error:', error);
        }
    }
};

// Simple version that only works when profile is accessible
module.exports.quick = {
    name: 'qdp',
    description: 'Quick profile picture - only when accessible',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            let targetJid = null;

            // Must be replying to a message
            if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                targetJid = msg.message.extendedTextMessage.contextInfo.participant;
            } else {
                await sock.sendMessage(from, { 
                    text: 'Reply to a message with .qdp' 
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

            console.log(`Quick DP for: ${targetJid}`);

            // Direct method only - one attempt
            try {
                const profilePic = await sock.profilePictureUrl(targetJid, 'image');
                if (profilePic) {
                    await sock.sendMessage(personalJid, {
                        image: { url: profilePic },
                        caption: `👤 ${phoneNumber}`
                    });
                } else {
                    await sock.sendMessage(personalJid, {
                        text: `❌ No profile picture for ${phoneNumber}`
                    });
                }
            } catch (error) {
                await sock.sendMessage(personalJid, {
                    text: `❌ Cannot access ${phoneNumber}'s profile picture\n\nUser may have privacy settings enabled.`
                });
            }

        } catch (error) {
            console.error('Quick DP error:', error);
        }
    }
};
