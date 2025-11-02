const axios = require('axios');

module.exports = {
    name: 'snapchat',
    description: 'Download Snapchat videos',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            const url = args[0];

            if (url && (url.includes('snapchat.com') || url.includes('snap'))) {
                await sock.sendMessage(from, { 
                    text: '📥 Processing Snapchat link...' 
                }, { quoted: msg });

                // Try multiple download methods
                const videoData = await downloadSnapchatRobust(url);
                
                if (videoData && videoData.videoUrl) {
                    await sock.sendMessage(from, { 
                        video: { url: videoData.videoUrl },
                        caption: videoData.caption || '📹 Snapchat Video'
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { 
                        text: '❌ Could not download. Try a public TikTok/Instagram link instead.' 
                    }, { quoted: msg });
                }
                return;
            }

            await sock.sendMessage(from, { 
                text: '👻 *Snapchat/TikTok/Instagram Downloader*\n\nUsage: .snapchat <link>\n\nBetter alternatives:\n.tiktok down <link> - For TikTok\n.instagram <link> - For Instagram' 
            }, { quoted: msg });

        } catch (error) {
            console.error('Snapchat command error:', error);
            await sock.sendMessage(from, { 
                text: '❌ Snapchat download failed. Try TikTok/Instagram links for better results.' 
            }, { quoted: msg });
        }
    }
};

async function downloadSnapchatRobust(url) {
    const methods = [
        downloadMethod1,
        downloadMethod2, 
        downloadMethod3,
        downloadMethod4
    ];

    for (const method of methods) {
        try {
            console.log(`Trying ${method.name}...`);
            const result = await method(url);
            if (result && result.videoUrl) {
                console.log(`Success with ${method.name}`);
                return result;
            }
        } catch (error) {
            console.log(`${method.name} failed:`, error.message);
            continue;
        }
    }
    
    return null;
}

// Method 1: SnapTik alternative for Snapchat-like links
async function downloadMethod1(url) {
    try {
        const apiUrl = `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, { timeout: 15000 });
        
        if (response.data?.video?.noWatermark) {
            return {
                videoUrl: response.data.video.noWatermark,
                caption: `🎵 ${response.data.title || 'Video'}\n👤 ${response.data.author?.nickname || 'Unknown'}`
            };
        }
    } catch (error) {
        throw new Error('Method 1 failed');
    }
}

// Method 2: Social media downloader API
async function downloadMethod2(url) {
    try {
        const apiUrl = `https://social-downloader.com/api/download?url=${encodeURIComponent(url)}&service=snapchat`;
        const response = await axios.get(apiUrl, { 
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.data?.url) {
            return {
                videoUrl: response.data.url,
                caption: '📹 Social Media Video'
            };
        }
    } catch (error) {
        throw new Error('Method 2 failed');
    }
}

// Method 3: Generic video downloader
async function downloadMethod3(url) {
    try {
        const apiUrl = `https://loader.to/api/download?url=${encodeURIComponent(url)}&format=mp4`;
        const response = await axios.get(apiUrl, { timeout: 15000 });
        
        if (response.data?.download_url) {
            return {
                videoUrl: response.data.download_url,
                caption: '📹 Downloaded Video'
            };
        }
    } catch (error) {
        throw new Error('Method 3 failed');
    }
}

// Method 4: Direct video check (for public URLs)
async function downloadMethod4(url) {
    try {
        // If it's already a direct video URL
        if (url.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
            return {
                videoUrl: url,
                caption: '📹 Direct Video'
            };
        }
        
        // Try to extract from Snapchat story
        if (url.includes('story.snapchat.com')) {
            const storyId = url.split('/p/')[1]?.split('/')[0];
            if (storyId) {
                return {
                    videoUrl: `https://story.snapchat.com/p/${storyId}`,
                    caption: `👻 Snapchat Story: ${storyId}`
                };
            }
        }
        
        throw new Error('Not a direct video URL');
    } catch (error) {
        throw new Error('Method 4 failed');
    }
}
