const axios = require('axios');

module.exports = {
    name: 'snapchat',
    description: 'Download Snapchat videos',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            const url = args[0];

            if (url && (url.includes('snapchat.com') || url.includes('snpy.app'))) {
                await sock.sendMessage(from, { 
                    text: '📥 Downloading Snapchat video...' 
                }, { quoted: msg });

                const videoData = await downloadSnapchat(url);
                
                if (videoData && videoData.videoUrl) {
                    await sock.sendMessage(from, { 
                        video: { url: videoData.videoUrl },
                        caption: `📹 Snapchat Video\n👤 ${videoData.author || 'Unknown user'}\n${videoData.duration ? `⏱️ ${videoData.duration}s` : ''}`
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { 
                        text: '❌ Failed to download Snapchat video. Link may be invalid or private.' 
                    }, { quoted: msg });
                }
                return;
            }

            await sock.sendMessage(from, { 
                text: '👻 *Snapchat Downloader*\n\nUsage: .snapchat <link>\n\nSupported links:\n• https://www.snapchat.com/add/username\n• https://snapchat.com/share/CODE\n• https://story.snapchat.com/p/CODE\n• https://snpy.app/CODE' 
            }, { quoted: msg });

        } catch (error) {
            console.error('Snapchat command error:', error);
            await sock.sendMessage(from, { 
                text: '❌ Error downloading Snapchat video. Please check the link.' 
            }, { quoted: msg });
        }
    }
};

async function downloadSnapchat(url) {
    try {
        // Method 1: Use Snapchat downloader API
        const apiUrl1 = `https://snapvid.cc/api/v1/download?url=${encodeURIComponent(url)}`;
        
        const response1 = await axios.get(apiUrl1, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        if (response1.data && response1.data.data) {
            const data = response1.data.data;
            return {
                videoUrl: data.mediaUrls?.video_no_watermark || data.mediaUrls?.video,
                author: data.author?.username || data.author?.displayName,
                duration: data.duration
            };
        }
        
    } catch (error) {
        console.log('Method 1 failed, trying alternative...');
    }

    try {
        // Method 2: Alternative API
        const apiUrl2 = `https://snapsave.app/action.php?url=${encodeURIComponent(url)}`;
        
        const response2 = await axios.get(apiUrl2, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (response2.data) {
            // Parse the response for video URLs
            const videoUrl = extractVideoUrl(response2.data);
            if (videoUrl) {
                return {
                    videoUrl: videoUrl,
                    author: extractUsername(url)
                };
            }
        }
        
    } catch (error) {
        console.log('Method 2 failed, trying final method...');
    }

    try {
        // Method 3: Direct media extraction
        return await downloadSnapchatDirect(url);
    } catch (error) {
        console.error('All Snapchat download methods failed:', error.message);
        return null;
    }
}

async function downloadSnapchatDirect(url) {
    try {
        // For public Snapchat stories
        if (url.includes('story.snapchat.com')) {
            const storyId = extractStoryId(url);
            if (storyId) {
                return {
                    videoUrl: `https://app.snapchat.com/web/deeplink/snapcode?username=${storyId}`,
                    author: storyId
                };
            }
        }
        
        // For snapcode links
        if (url.includes('snapchat.com/add/')) {
            const username = extractUsername(url);
            return {
                videoUrl: `https://app.snapchat.com/web/deeplink/snapcode?username=${username}`,
                author: username
            };
        }
        
        return null;
    } catch (error) {
        throw new Error('Direct download failed');
    }
}

function extractVideoUrl(htmlData) {
    try {
        // Extract video URL from HTML response
        const videoRegex = /(https?:\/\/[^\s"']+\.mp4[^\s"']*)/gi;
        const matches = htmlData.match(videoRegex);
        return matches ? matches[0] : null;
    } catch (error) {
        return null;
    }
}

function extractUsername(url) {
    try {
        if (url.includes('snapchat.com/add/')) {
            return url.split('snapchat.com/add/')[1]?.split('?')[0] || 'Unknown';
        }
        if (url.includes('story.snapchat.com/p/')) {
            return url.split('story.snapchat.com/p/')[1]?.split('/')[0] || 'Unknown';
        }
        return 'Unknown';
    } catch (error) {
        return 'Unknown';
    }
}

function extractStoryId(url) {
    try {
        const match = url.match(/story\.snapchat\.com\/p\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    } catch (error) {
        return null;
    }
}
