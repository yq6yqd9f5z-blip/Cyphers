const axios = require('axios');

module.exports = {
    name: 'dp',
    description: 'Download WhatsApp profile picture to your personal chat',
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

            // REACT with 🙄 emoji to the command message
            try {
                await sock.sendMessage(from, {
                    react: {
                        text: '🙄',
                        key: msg.key
                    }
                });
            } catch (reactError) {
                console.log('Could not react to message');
            }

            // Get YOUR personal chat JID (the "you" chat)
            const yourPersonalJid = msg.key.participant || from;
            const yourNumber = yourPersonalJid.split('@')[0];
            const yourPersonalChat = `${yourNumber}@s.whatsapp.net`;

            console.log(`Saving to your personal chat: ${yourPersonalChat}`);

            // Use the target JID if we have it from reply, otherwise create from phone number
            const userJid = targetJid || `${phoneNumber}@s.whatsapp.net`;

            console.log(`Getting profile picture for: ${userJid}`);

            // METHOD 1: Direct profile picture
            try {
                console.log('Trying direct profile picture...');
                const profilePic = await sock.profilePictureUrl(userJid, 'image');
                
                if (profilePic) {
                    console.log('✅ Profile picture found!');
                    await sock.sendMessage(yourPersonalChat, {
                        image: { url: profilePic },
                        caption: `👤 ${phoneNumber}\n✅ Profile Picture`
                    });
                    return;
                }
            } catch (error) {
                console.log('Method 1 failed:', error.message);
            }

            // METHOD 2: Try preview
            try {
                console.log('Trying preview image...');
                const previewPic = await sock.profilePictureUrl(userJid, 'preview');
                
                if (previewPic) {
                    console.log('✅ Preview image found!');
                    await sock.sendMessage(yourPersonalChat, {
                        image: { url: previewPic },
                        caption: `👤 ${phoneNumber}\n✅ Preview`
                    });
                    return;
                }
            } catch (error) {
                console.log('Method 2 failed:', error.message);
            }

            // METHOD 3: Presence update and retry
            try {
                console.log('Trying with presence update...');
                await sock.sendPresenceUpdate('available', userJid);
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const retryPic = await sock.profilePictureUrl(userJid, 'image');
                if (retryPic) {
                    console.log('✅ Profile picture after presence update!');
                    await sock.sendMessage(yourPersonalChat, {
                        image: { url: retryPic },
                        caption: `👤 ${phoneNumber}\n✅ Profile Picture`
                    });
                    return;
                }
            } catch (error) {
                console.log('Method 3 failed:', error.message);
            }

            // If all methods fail, send error to your personal chat
            console.log('All methods failed');
            await sock.sendMessage(yourPersonalChat, {
                text: `❌ Cannot access profile picture for ${phoneNumber}\n\nUser may have:\n• No profile picture\n• Privacy settings enabled\n• Account doesn't exist`
            });

        } catch (error) {
            console.error('DP command error:', error);
        }
    }
};

// Quick version with just the reaction
module.exports.quick = {
    name: 'qdp',
    description: 'Quick profile picture download',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            let targetJid = null;

            // Must be replying to a message
            if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                targetJid = msg.message.extendedTextMessage.contextInfo.participant;
            } else {
                // React with ❌ if no reply
                await sock.sendMessage(from, {
                    react: {
                        text: '❌',
                        key: msg.key
                    }
                });
                return;
            }

            const phoneNumber = targetJid.split('@')[0];

            // REACT with 🙄 emoji
            await sock.sendMessage(from, {
                react: {
                    text: '🙄',
                    key: msg.key
                }
            });

            // Get YOUR personal chat
            const yourPersonalJid = msg.key.participant || from;
            const yourNumber = yourPersonalJid.split('@')[0];
            const yourPersonalChat = `${yourNumber}@s.whatsapp.net`;

            console.log(`Quick DP for: ${targetJid}`);

            // One direct attempt
            try {
                const profilePic = await sock.profilePictureUrl(targetJid, 'image');
                if (profilePic) {
                    await sock.sendMessage(yourPersonalChat, {
                        image: { url: profilePic },
                        caption: `👤 ${phoneNumber}`
                    });
                } else {
                    await sock.sendMessage(yourPersonalChat, {
                        text: `❌ No profile picture for ${phoneNumber}`
                    });
                }
            } catch (error) {
                await sock.sendMessage(yourPersonalChat, {
                    text: `❌ Cannot access ${phoneNumber}'s profile picture`
                });
            }

        } catch (error) {
            console.error('Quick DP error:', error);
        }
    }
};

// Silent version - only reaction, no messages
module.exports.stealth = {
    name: 'sdp',
    description: 'Stealth profile picture download',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            let targetJid = null;
            let phoneNumber = args[0];

            // Get target from reply or args
            if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                targetJid = msg.message.extendedTextMessage.contextInfo.participant;
                phoneNumber = targetJid.split('@')[0];
            } else if (!phoneNumber) {
                // React with ❌ if no target
                await sock.sendMessage(from, {
                    react: {
                        text: '❌',
                        key: msg.key
                    }
                });
                return;
            }

            // Clean number
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            if (phoneNumber.length < 10) {
                await sock.sendMessage(from, {
                    react: {
                        text: '❌',
                        key: msg.key
                    }
                });
                return;
            }

            // REACT with 🙄 emoji
            await sock.sendMessage(from, {
                react: {
                    text: '🙄',
                    key: msg.key
                }
            });

            // Get YOUR personal chat
            const yourPersonalJid = msg.key.participant || from;
            const yourNumber = yourPersonalJid.split('@')[0];
            const yourPersonalChat = `${yourNumber}@s.whatsapp.net`;

            const userJid = targetJid || `${phoneNumber}@s.whatsapp.net`;

            // Silent download - no error messages
            try {
                const profilePic = await sock.profilePictureUrl(userJid, 'image');
                if (profilePic) {
                    await sock.sendMessage(yourPersonalChat, {
                        image: { url: profilePic }
                    });
                }
                // If no profile pic, do nothing (silent)
            } catch (error) {
                // Silent fail - no error message
            }

        } catch (error) {
            console.error('Stealth DP error:', error);
        }
    }
};

// Bulk download version
module.exports.bulk = {
    name: 'bdp',
    description: 'Bulk download profile pictures',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        if (!args.length) {
            await sock.sendMessage(from, {
                react: {
                    text: '❌',
                    key: msg.key
                }
            });
            return;
        }

        // REACT with 🙄 emoji
        await sock.sendMessage(from, {
            react: {
                text: '🙄',
                key: msg.key
            }
        });

        // Get YOUR personal chat
        const yourPersonalJid = msg.key.participant || from;
        const yourNumber = yourPersonalJid.split('@')[0];
        const yourPersonalChat = `${yourNumber}@s.whatsapp.net`;

        let successCount = 0;
        
        for (const number of args) {
            try {
                const cleanNumber = number.replace(/[^0-9]/g, '');
                if (cleanNumber.length < 10) continue;

                const userJid = `${cleanNumber}@s.whatsapp.net`;
                
                const profilePic = await sock.profilePictureUrl(userJid, 'image');
                if (profilePic) {
                    await sock.sendMessage(yourPersonalChat, {
                        image: { url: profilePic },
                        caption: `👤 ${cleanNumber}`
                    });
                    successCount++;
                }
                
                // Delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                continue;
            }
        }

        // Send summary to your personal chat
        await sock.sendMessage(yourPersonalChat, {
            text: `📊 Bulk download complete!\n✅ Success: ${successCount}/${args.length}`
        });

    }
};
