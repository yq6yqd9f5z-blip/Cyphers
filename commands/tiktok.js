const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    name: 'tiktok',
    description: 'Download TikTok videos',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            const action = args[0]?.toLowerCase();
            const url = args[1];

            if (action === 'down' && url) {
                await sock.sendMessage(from, { 
                    text: '📥 Downloading TikTok video...' 
                }, { quoted: msg });

                const videoData = await downloadTikTok(url);
                
                if (videoData && videoData.videoUrl) {
                    await sock.sendMessage(from, { 
                        video: { url: videoData.videoUrl },
                        caption: `🎵 ${videoData.title || 'TikTok Video'}\n👤 ${videoData.author || 'Unknown'}\n❤️ ${videoData.likes || 'N/A'} likes`
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { 
                        text: '❌ Failed to download video. Link may be invalid.' 
                    }, { quoted: msg });
                }
                return;
            }

            await sock.sendMessage(from, { 
                text: '📱 *TikTok Downloader*\n\nUsage: .tiktok down <link>\n\nExample: .tiktok down https://vm.tiktok.com/ABC123/' 
            }, { quoted: msg });

        } catch (error) {
            console.error('TikTok command error:', error);
            await sock.sendMessage(from, { 
                text: '❌ Error downloading video. Please check the link.' 
            }, { quoted: msg });
        }
    }
};

async function downloadTikTok(url) {
    try {
        // Use TikTok downloader API
        const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
        
        const response = await axios.get(apiUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (response.data && response.data.data) {
            const data = response.data.data;
            return {
                videoUrl: data.play || data.hdplay || data.wmplay,
                title: data.title,
                author: data.author?.nickname || 'Unknown',
                likes: data.digg_count,
                duration: data.duration
            };
        }
        
        throw new Error('No video data found');
        
    } catch (error) {
        console.error('TikTok download error:', error.message);
        
        // Fallback to alternative API
        return await downloadTikTokAlternative(url);
    }
}

async function downloadTikTokAlternative(url) {
    try {
        const apiUrl = `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`;
        
        const response = await axios.get(apiUrl, {
            timeout: 30000
        });

        if (response.data && response.data.video) {
            return {
                videoUrl: response.data.video.noWatermark || response.data.video.withWatermark,
                title: response.data.title,
                author: response.data.author?.nickname,
                likes: response.data.stats?.diggCount,
                duration: response.data.duration
            };
        }
        
        throw new Error('Alternative API failed');
        
    } catch (error) {
        console.error('Alternative TikTok download error:', error.message);
        return null;
    }
}
