const ytdl = require('ytdl-core');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
    name: 'play',
    description: 'Download music from YouTube - Updated Working Version',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        if (!args.length) {
            await sock.sendMessage(from, {
                text: `🎵 *MUSIC DOWNLOADER*\n\nUsage: .play <song name>\n\nExamples:\n.play believer\n.play asake\n.play omah lay`
            }, { quoted: msg });
            return;
        }

        const searchQuery = args.join(' ');
        
        try {
            await sock.sendMessage(from, {
                text: `🔍 Searching for: "${searchQuery}"\n⏳ Please wait...`
            }, { quoted: msg });

            // Search for the video
            const searchResult = await yts(searchQuery);
            
            if (!searchResult.videos.length) {
                await sock.sendMessage(from, {
                    text: `❌ No results found for "${searchQuery}"`
                }, { quoted: msg });
                return;
            }

            // Get the first video
            const video = searchResult.videos[0];
            const videoUrl = video.url;
            const videoTitle = video.title;

            console.log(`🎬 Attempting download: ${videoTitle}`);

            // Try multiple download methods
            const audioBuffer = await tryMultipleDownloadMethods(videoUrl);
            
            if (audioBuffer) {
                await sock.sendMessage(from, {
                    audio: audioBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${videoTitle.substring(0, 40)}.mp3`,
                    ptt: false
                });
                
                await sock.sendMessage(from, {
                    text: `✅ *Download Complete!*\n\n🎵 ${videoTitle}\n🎤 ${video.author.name}\n⏱️ ${video.timestamp}\n\nEnjoy your music! 🎧`
                });
            } else {
                await sock.sendMessage(from, {
                    text: `❌ Download failed for: ${videoTitle}\n\nThis video may be restricted or unavailable for download.`
                });
            }

        } catch (error) {
            console.error('Play command error:', error);
            await sock.sendMessage(from, {
                text: `❌ Error: ${error.message}\n\nTry a different song or check your connection.`
            }, { quoted: msg });
        }
    }
};

// Try multiple download methods
async function tryMultipleDownloadMethods(videoUrl) {
    // Method 1: Try with different quality options
    try {
        console.log('🔄 Trying method 1: Standard download');
        return await downloadWithRetry(videoUrl);
    } catch (error) {
        console.log('Method 1 failed:', error.message);
    }

    // Method 2: Try with no options
    try {
        console.log('🔄 Trying method 2: Basic download');
        return await downloadBasic(videoUrl);
    } catch (error) {
        console.log('Method 2 failed:', error.message);
    }

    // Method 3: Try with lowest quality
    try {
        console.log('🔄 Trying method 3: Lowest quality');
        return await downloadLowestQuality(videoUrl);
    } catch (error) {
        console.log('Method 3 failed:', error.message);
    }

    return null;
}

// Download with retry logic
function downloadWithRetry(videoUrl) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        
        try {
            const stream = ytdl(videoUrl, {
                quality: 'highestaudio',
                filter: 'audioonly',
                highWaterMark: 1 << 25,
            });

            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);

            // Timeout after 45 seconds
            setTimeout(() => reject(new Error('Download timeout')), 45000);

        } catch (error) {
            reject(error);
        }
    });
}

// Basic download without options
function downloadBasic(videoUrl) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        
        try {
            const stream = ytdl(videoUrl);

            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);

            setTimeout(() => reject(new Error('Download timeout')), 45000);

        } catch (error) {
            reject(error);
        }
    });
}

// Download with lowest quality
function downloadLowestQuality(videoUrl) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        
        try {
            const stream = ytdl(videoUrl, {
                quality: 'lowestaudio',
                filter: 'audioonly',
            });

            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);

            setTimeout(() => reject(new Error('Download timeout')), 45000);

        } catch (error) {
            reject(error);
        }
    });
}

// Alternative: Use external API as fallback
module.exports.alt = {
    name: 'play2',
    description: 'Alternative music download using external service',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        if (!args.length) {
            await sock.sendMessage(from, {
                text: 'Usage: .play2 <song name>'
            }, { quoted: msg });
            return;
        }

        const searchQuery = args.join(' ');
        
        try {
            await sock.sendMessage(from, {
                text: `🔍 Searching: "${searchQuery}"\nUsing alternative method...`
            }, { quoted: msg });

            // Use a different search approach
            const searchResult = await yts(searchQuery + ' audio');
            
            if (!searchResult.videos.length) {
                await sock.sendMessage(from, {
                    text: `❌ No results found`
                });
                return;
            }

            const video = searchResult.videos[0];
            
            // Send the YouTube link as alternative
            await sock.sendMessage(from, {
                text: `🎵 *Alternative Solution*\n\nSince downloads are currently limited, here's the YouTube link:\n\n${video.url}\n\nTitle: ${video.title}\nDuration: ${video.timestamp}`
            });

        } catch (error) {
            console.error('Play2 error:', error);
            await sock.sendMessage(from, {
                text: `❌ Alternative method also failed`
            });
        }
    }
};

// Simple search only command
module.exports.search = {
    name: 'music',
    description: 'Search for music and get YouTube links',
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
            await sock.sendMessage(from, {
                text: `🔍 Searching for "${query}"...`
            });

            const searchResult = await yts(query);
            
            if (!searchResult.videos.length) {
                await sock.sendMessage(from, {
                    text: `❌ No results found`
                });
                return;
            }

            let results = `🎵 *Search Results:*\n\n`;
            
            searchResult.videos.slice(0, 3).forEach((video, index) => {
                results += `${index + 1}. *${video.title}*\n`;
                results += `   👤 ${video.author.name}\n`;
                results += `   ⏱️ ${video.timestamp}\n`;
                results += `   🔗 ${video.url}\n\n`;
            });

            results += '💡 *Note:* Direct downloads may be limited due to YouTube restrictions';

            await sock.sendMessage(from, { text: results });

        } catch (error) {
            console.error('Music search error:', error);
            await sock.sendMessage(from, {
                text: `❌ Search failed: ${error.message}`
            });
        }
    }
};

// YouTube link converter (if download works for some videos)
module.exports.link = {
    name: 'yt',
    description: 'Download from specific YouTube URL',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        if (!args.length) {
            await sock.sendMessage(from, {
                text: 'Usage: .yt <youtube-url>'
            }, { quoted: msg });
            return;
        }

        const youtubeUrl = args[0];
        
        if (!ytdl.validateURL(youtubeUrl)) {
            await sock.sendMessage(from, {
                text: '❌ Invalid YouTube URL'
            }, { quoted: msg });
            return;
        }

        try {
            await sock.sendMessage(from, {
                text: '⬇️ Attempting to download from YouTube URL...'
            }, { quoted: msg });

            const info = await ytdl.getInfo(youtubeUrl);
            const title = info.videoDetails.title;

            const audioBuffer = await downloadBasic(youtubeUrl);
            
            if (audioBuffer) {
                await sock.sendMessage(from, {
                    audio: audioBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${title.substring(0, 40)}.mp3`
                });
                
                await sock.sendMessage(from, {
                    text: `✅ Downloaded: ${title}`
                });
            } else {
                await sock.sendMessage(from, {
                    text: `❌ Failed to download: ${title}`
                });
            }

        } catch (error) {
            console.error('YT download error:', error);
            await sock.sendMessage(from, {
                text: `❌ Download failed: ${error.message}`
            });
        }
    }
};
