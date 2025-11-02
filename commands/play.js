const ytdl = require('ytdl-core');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

module.exports = {
    name: 'play',
    description: 'Download audio and video from YouTube - Working Version',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        if (!args.length) {
            await sock.sendMessage(from, {
                text: `🎵 *MUSIC DOWNLOADER*\n\nUsage: .play <song name>\n\nExamples:\n.play believer imagine dragons\n.play asake\n.play latest naija music`
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

            // Get the best video
            const video = searchResult.videos[0];
            const videoUrl = video.url;
            const videoTitle = video.title;

            console.log(`🎬 Downloading: ${videoTitle}`);

            // Create temp directory
            const tempDir = './temp_downloads';
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const timestamp = Date.now();
            const audioPath = path.join(tempDir, `audio_${timestamp}.mp3`);

            // Download audio first (most reliable)
            await sock.sendMessage(from, {
                text: `⬇️ Downloading audio...`
            });

            const audioSuccess = await downloadAudioSimple(videoUrl, audioPath);
            
            if (audioSuccess) {
                const audioStats = fs.statSync(audioPath);
                const audioSizeMB = audioStats.size / (1024 * 1024);
                
                if (audioSizeMB <= 16) {
                    await sock.sendMessage(from, {
                        audio: fs.readFileSync(audioPath),
                        mimetype: 'audio/mpeg',
                        fileName: `${videoTitle.substring(0, 40)}.mp3`,
                        ptt: false
                    });
                    
                    await sock.sendMessage(from, {
                        text: `✅ *Download Complete!*\n\n🎵 ${videoTitle}\n💾 ${audioSizeMB.toFixed(1)}MB\n🎧 Audio delivered successfully!`
                    });
                } else {
                    await sock.sendMessage(from, {
                        text: `❌ File too large: ${audioSizeMB.toFixed(1)}MB (max 16MB)`
                    });
                }
                
                // Cleanup
                if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
                
            } else {
                await sock.sendMessage(from, {
                    text: `❌ Download failed. The video may be restricted or unavailable.`
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

// Simple reliable audio download
function downloadAudioSimple(videoUrl, outputPath) {
    return new Promise((resolve) => {
        try {
            const stream = ytdl(videoUrl, {
                quality: 'highestaudio',
                filter: 'audioonly',
            });

            const writeStream = fs.createWriteStream(outputPath);
            
            stream.pipe(writeStream);

            stream.on('end', () => {
                console.log('✅ Audio download completed');
                resolve(true);
            });

            stream.on('error', (error) => {
                console.error('Audio download error:', error);
                resolve(false);
            });

            writeStream.on('error', (error) => {
                console.error('File write error:', error);
                resolve(false);
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                if (writeStream.writable) {
                    writeStream.destroy();
                    resolve(false);
                }
            }, 30000);

        } catch (error) {
            console.error('Download function error:', error);
            resolve(false);
        }
    });
}

// Alternative download method using different quality
function downloadAudioAlternative(videoUrl, outputPath) {
    return new Promise((resolve) => {
        try {
            const stream = ytdl(videoUrl, {
                quality: 'lowestaudio',
                filter: 'audioonly',
            });

            const writeStream = fs.createWriteStream(outputPath);
            
            stream.pipe(writeStream);

            stream.on('end', () => resolve(true));
            stream.on('error', () => resolve(false));
            writeStream.on('error', () => resolve(false));

        } catch (error) {
            resolve(false);
        }
    });
}

// Quick search command
module.exports.search = {
    name: 'music',
    description: 'Search for music before downloading',
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
                    text: `❌ No results found for "${query}"`
                });
                return;
            }

            let results = `🎵 *Search Results:*\n\n`;
            
            searchResult.videos.slice(0, 5).forEach((video, index) => {
                results += `${index + 1}. ${video.title}\n`;
                results += `   👤 ${video.author.name}\n`;
                results += `   ⏱️ ${video.timestamp}\n\n`;
            });

            results += '💡 Reply with: .play <number>';

            await sock.sendMessage(from, { text: results });

            // Store results for quick download
            if (!global.musicResults) global.musicResults = new Map();
            global.musicResults.set(from, searchResult.videos.slice(0, 5));

        } catch (error) {
            console.error('Music search error:', error);
            await sock.sendMessage(from, {
                text: `❌ Search failed: ${error.message}`
            });
        }
    }
};

// Quick download from search results
module.exports.quick = {
    name: 'play',
    description: 'Quick download from search results',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        if (!args.length || !global.musicResults?.get(from)) {
            await sock.sendMessage(from, {
                text: '❌ No search results found. Use .music first.'
            }, { quoted: msg });
            return;
        }

        const num = parseInt(args[0]);
        const videos = global.musicResults.get(from);

        if (isNaN(num) || num < 1 || num > videos.length) {
            await sock.sendMessage(from, {
                text: `❌ Please select a number between 1-${videos.length}`
            }, { quoted: msg });
            return;
        }

        const selectedVideo = videos[num - 1];
        
        // Use the main play function
        const mainModule = require('./play');
        await mainModule.execute(sock, msg, selectedVideo.title.split(' '));
    }
};

// Test command to check if downloads work
module.exports.test = {
    name: 'testplay',
    description: 'Test music download with a known working song',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        await sock.sendMessage(from, {
            text: '🧪 Testing music download with a known working song...'
        }, { quoted: msg });

        // Use a simple, reliable test song
        const mainModule = require('./play');
        await mainModule.execute(sock, msg, ['believer', 'imagine', 'dragons']);
    }
};

// Cleanup temp files periodically
setInterval(() => {
    const tempDir = './temp_downloads';
    if (fs.existsSync(tempDir)) {
        try {
            const files = fs.readdirSync(tempDir);
            files.forEach(file => {
                try {
                    fs.unlinkSync(path.join(tempDir, file));
                } catch (e) {
                    // Ignore errors during cleanup
                }
            });
        } catch (error) {
            console.log('Cleanup error:', error.message);
        }
    }
}, 600000); // Clean every 10 minutes
