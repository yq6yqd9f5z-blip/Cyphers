const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'play',
    description: 'Advanced Music Download - Bypass YouTube Restrictions',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        if (!args.length) {
            await sock.sendMessage(from, {
                text: `🎵 *ADVANCED MUSIC DOWNLOADER* ⚡

🚀 *Usage:* .play <song name>

🎯 *Examples:*
.play believer imagine dragons
.play asake lonely at the top
.play omah lay holy ghost
.play latest naija music

💫 *Powered by Multi-Source Download Engine*`
            }, { quoted: msg });
            return;
        }

        const searchQuery = args.join(' ');
        
        try {
            // React immediately
            await sock.sendMessage(from, {
                react: {
                    text: '🎵',
                    key: msg.key
                }
            });

            await sock.sendMessage(from, {
                text: `🔍 *Searching Across Multiple Sources...*\n\n"${searchQuery}"\n\n⚡ Initializing download engines...`
            }, { quoted: msg });

            // Search for the video first
            const searchResult = await yts(searchQuery);
            
            if (!searchResult.videos.length) {
                await sock.sendMessage(from, {
                    text: `❌ *No Results Found*\n\n"${searchQuery}"\n\nTry different keywords or check spelling.`
                }, { quoted: msg });
                return;
            }

            const video = searchResult.videos[0];
            const videoTitle = video.title;
            const videoUrl = video.url;
            const videoId = video.videoId;

            console.log(`🎬 Advanced Download: ${videoTitle}`);

            // Try multiple download methods sequentially
            const downloadResult = await advancedDownloadEngine(videoTitle, videoUrl, videoId);
            
            if (downloadResult.success) {
                await sock.sendMessage(from, {
                    audio: { url: downloadResult.audioUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${cleanFileName(videoTitle)}.mp3`,
                    ptt: false
                }, { quoted: msg });

                await sock.sendMessage(from, {
                    react: {
                        text: '✅',
                        key: msg.key
                    }
                });

                await sock.sendMessage(from, {
                    text: `✅ *DOWNLOAD SUCCESSFUL!* 🎉\n\n🎵 *Title:* ${videoTitle}\n🎤 *Artist:* ${video.author?.name || 'Unknown'}\n⏱️ *Duration:* ${video.timestamp || 'Unknown'}\n💫 *Source:* ${downloadResult.source}\n\n🎧 Enjoy your music!`
                });

            } else {
                await sock.sendMessage(from, {
                    react: {
                        text: '❌',
                        key: msg.key
                    }
                });

                // Fallback: Send YouTube link
                await sock.sendMessage(from, {
                    text: `🎵 *Alternative Solution*\n\n*Title:* ${videoTitle}\n*Duration:* ${video.timestamp}\n*Channel:* ${video.author?.name || 'Unknown'}\n\n🔗 *YouTube Link:* ${videoUrl}\n\n💡 *Tip:* You can use YouTube's download feature or try again later.`
                });
            }

        } catch (error) {
            console.error('Advanced play error:', error);
            await sock.sendMessage(from, {
                react: {
                    text: '❌',
                    key: msg.key
                }
            });
            
            await sock.sendMessage(from, {
                text: `⚠️ *System Overload*\n\nDownload engines are currently busy. Try again in a few moments.\n\nError: ${error.message}`
            }, { quoted: msg });
        }
    }
};

// Advanced download engine with multiple sources
async function advancedDownloadEngine(title, youtubeUrl, videoId) {
    console.log('🚀 Starting advanced download engine...');

    // Method 1: YouTube MP3 Conversion API
    try {
        console.log('🔄 Method 1: YouTube MP3 API');
        const result = await youtubeMp3API(videoId);
        if (result.success) return result;
    } catch (error) {
        console.log('Method 1 failed:', error.message);
    }

    // Method 2: External Download Service
    try {
        console.log('🔄 Method 2: External Service');
        const result = await externalDownloadService(youtubeUrl);
        if (result.success) return result;
    } catch (error) {
        console.log('Method 2 failed:', error.message);
    }

    // Method 3: Online Converter API
    try {
        console.log('🔄 Method 3: Online Converter');
        const result = await onlineConverterAPI(youtubeUrl);
        if (result.success) return result;
    } catch (error) {
        console.log('Method 3 failed:', error.message);
    }

    // Method 4: Alternative YouTube Frontend
    try {
        console.log('🔄 Method 4: YouTube Alternative');
        const result = await youtubeAlternative(youtubeUrl);
        if (result.success) return result;
    } catch (error) {
        console.log('Method 4 failed:', error.message);
    }

    return { success: false, error: 'All download methods failed' };
}

// Method 1: YouTube to MP3 API
async function youtubeMp3API(videoId) {
    try {
        const apis = [
            `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`,
            `https://youtube-mp3-download1.p.rapidapi.com/dl?id=${videoId}`,
            `https://youtube-to-mp3.p.rapidapi.com/dl?id=${videoId}`
        ];

        for (const apiUrl of apis) {
            try {
                const response = await axios.get(apiUrl, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json'
                    }
                });

                if (response.data && response.data.link) {
                    return {
                        success: true,
                        audioUrl: response.data.link,
                        source: 'YouTube MP3 API'
                    };
                }
            } catch (error) {
                continue;
            }
        }
        throw new Error('All YouTube APIs failed');
    } catch (error) {
        throw error;
    }
}

// Method 2: External Download Service
async function externalDownloadService(youtubeUrl) {
    try {
        const services = [
            `https://api.vevioz.com/api/button/mp3/${getVideoId(youtubeUrl)}`,
            `https://api.onlinevideoconverter.pro/api/convert`,
            `https://y2mate.com/api/convert`
        ];

        for (const serviceUrl of services) {
            try {
                const response = await axios.post(serviceUrl, {
                    url: youtubeUrl,
                    format: 'mp3'
                }, {
                    timeout: 15000,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                if (response.data && response.data.url) {
                    return {
                        success: true,
                        audioUrl: response.data.url,
                        source: 'External Service'
                    };
                }
            } catch (error) {
                continue;
            }
        }
        throw new Error('All external services failed');
    } catch (error) {
        throw error;
    }
}

// Method 3: Online Converter
async function onlineConverterAPI(youtubeUrl) {
    try {
        const converters = [
            {
                url: 'https://api.convert2mp3.com/convert',
                params: { url: youtubeUrl, format: 'mp3' }
            },
            {
                url: 'https://onlinevideoconverter.com/api/convert',
                params: { url: youtubeUrl, format: 'mp3' }
            }
        ];

        for (const converter of converters) {
            try {
                const response = await axios.get(converter.url, {
                    params: converter.params,
                    timeout: 10000
                });

                if (response.data && response.data.downloadUrl) {
                    return {
                        success: true,
                        audioUrl: response.data.downloadUrl,
                        source: 'Online Converter'
                    };
                }
            } catch (error) {
                continue;
            }
        }
        throw new Error('All converters failed');
    } catch (error) {
        throw error;
    }
}

// Method 4: YouTube Alternative Frontend
async function youtubeAlternative(youtubeUrl) {
    try {
        const alternatives = [
            `https://invidious.snopyta.org/api/v1/videos/${getVideoId(youtubeUrl)}`,
            `https://yewtu.be/api/v1/videos/${getVideoId(youtubeUrl)}`,
            `https://inv.riverside.rocks/api/v1/videos/${getVideoId(youtubeUrl)}`
        ];

        for (const altUrl of alternatives) {
            try {
                const response = await axios.get(altUrl, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                if (response.data && response.data.audioStreams && response.data.audioStreams.length > 0) {
                    const bestAudio = response.data.audioStreams.reduce((best, current) => {
                        return current.bitrate > best.bitrate ? current : best;
                    });

                    return {
                        success: true,
                        audioUrl: bestAudio.url,
                        source: 'YouTube Alternative'
                    };
                }
            } catch (error) {
                continue;
            }
        }
        throw new Error('All alternatives failed');
    } catch (error) {
        throw error;
    }
}

// Utility functions
function getVideoId(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
}

function cleanFileName(name) {
    return name.replace(/[^a-z0-9]/gi, '_').substring(0, 40);
}

// Fast download command for quick results
module.exports.fast = {
    name: 'playfast',
    description: 'Fast music download with direct links',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        if (!args.length) {
            await sock.sendMessage(from, {
                text: '⚡ Usage: .playfast <song name>'
            }, { quoted: msg });
            return;
        }

        const searchQuery = args.join(' ');
        
        try {
            await sock.sendMessage(from, {
                react: {
                    text: '⚡',
                    key: msg.key
                }
            });

            // Quick search
            const searchResult = await yts(searchQuery);
            if (!searchResult.videos.length) {
                await sock.sendMessage(from, { text: '❌ No results' });
                return;
            }

            const video = searchResult.videos[0];
            
            // Use a simple direct service
            const audioUrl = await getDirectDownloadLink(video.url);
            
            if (audioUrl) {
                await sock.sendMessage(from, {
                    audio: { url: audioUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${cleanFileName(video.title)}.mp3`
                }, { quoted: msg });

                await sock.sendMessage(from, {
                    react: {
                        text: '✅',
                        key: msg.key
                    }
                });
            } else {
                await sock.sendMessage(from, {
                    text: `🎵 ${video.title}\n🔗 ${video.url}\n\n💡 Direct download not available. Here's the YouTube link.`
                });
            }

        } catch (error) {
            console.error('Fast play error:', error);
            await sock.sendMessage(from, {
                text: '⚡ Fast download failed. Try .play for advanced methods.'
            });
        }
    }
};

// Direct download link generator
async function getDirectDownloadLink(youtubeUrl) {
    try {
        const videoId = getVideoId(youtubeUrl);
        const services = [
            `https://api.download-lagu-mp3.com/@api/button/mp3/${videoId}`,
            `https://convert2mp3.info/api/button/mp3/${videoId}`,
            `https://ytmp3.cc/api/button/mp3/${videoId}`
        ];

        for (const service of services) {
            try {
                const response = await axios.get(service, { timeout: 8000 });
                if (response.data && response.data.direct_link) {
                    return response.data.direct_link;
                }
            } catch (error) {
                continue;
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Bulk music search
module.exports.search = {
    name: 'music',
    description: 'Search multiple music results',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        if (!args.length) {
            await sock.sendMessage(from, {
                text: '🔍 Usage: .music <song name>'
            }, { quoted: msg });
            return;
        }

        const query = args.join(' ');
        
        try {
            const searchResult = await yts(query);
            
            if (!searchResult.videos.length) {
                await sock.sendMessage(from, { text: '❌ No results' });
                return;
            }

            let results = `🎵 *Search Results for "*${query}*"*\n\n`;
            
            searchResult.videos.slice(0, 5).forEach((video, index) => {
                results += `${index + 1}. *${video.title}*\n`;
                results += `   👤 ${video.author.name}\n`;
                results += `   ⏱️ ${video.timestamp}\n`;
                results += `   👁️ ${formatViews(video.views)}\n\n`;
            });

            results += '💡 *Reply with:* .play <number> to download';

            await sock.sendMessage(from, { text: results });

            // Store for quick access
            if (!global.musicCache) global.musicCache = new Map();
            global.musicCache.set(from, searchResult.videos.slice(0, 5));

        } catch (error) {
            console.error('Music search error:', error);
            await sock.sendMessage(from, {
                text: `❌ Search failed: ${error.message}`
            });
        }
    }
};

function formatViews(views) {
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views;
}
