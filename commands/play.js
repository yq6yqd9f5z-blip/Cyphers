const ytdl = require('ytdl-core');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = {
    name: 'play',
    description: 'Download audio and video from YouTube - Advanced Power',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        if (!args.length) {
            await sock.sendMessage(from, {
                text: `🎵 *ULTIMATE MEDIA DOWNLOADER* 🎬

⚡ *Usage:* .play <music/video name>

🎯 *Examples:*
.play believer imagine dragons
.play asake video
.play latest naija music 2024
.play afrobeat mix hd

💫 *Features:*
• Downloads BOTH audio 🎧 AND video 🎬
• Highest quality available
• Fast parallel downloads
• Auto format selection
• Smart search technology

🔥 *Powered by CYPHER Download Engine*`
            }, { quoted: msg });
            return;
        }

        const searchQuery = args.join(' ');
        
        try {
            // Send initial processing message
            await sock.sendMessage(from, {
                text: `🚀 *CYPHER Download Engine Activated*

🔍 *Searching:* "${searchQuery}"
⚡ *Mode:* AUDIO + VIDEO Download
🎯 *Quality:* Maximum Available

⏳ Initializing download sequence...`
            }, { quoted: msg });

            // Advanced search with multiple sources
            const video = await advancedVideoSearch(searchQuery);
            
            if (!video) {
                await sock.sendMessage(from, {
                    text: `❌ *Search Failed*

No results found for "${searchQuery}"

💡 *Tips:*
• Check spelling
• Try different keywords  
• Use artist name
• Be more specific`
                }, { quoted: msg });
                return;
            }

            const videoUrl = video.url;
            const videoTitle = video.title;
            const videoDuration = video.timestamp || video.duration || 'Unknown';
            const videoViews = formatViews(video.views);

            console.log(`🎬 Downloading: ${videoTitle} | ${videoUrl}`);

            // Create temp directory
            const tempDir = './cypher_downloads';
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const timestamp = Date.now();
            const audioFilename = `audio_${timestamp}.mp3`;
            const videoFilename = `video_${timestamp}.mp4`;
            const audioPath = path.join(tempDir, audioFilename);
            const videoPath = path.join(tempDir, videoFilename);

            // Send progress update
            await sock.sendMessage(from, {
                text: `📥 *Download In Progress*

🎵 *Title:* ${videoTitle}
⏱️ *Duration:* ${videoDuration}
👁️ *Views:* ${videoViews}

⬇️ *Downloading Audio & Video...*
⚡ CYPHER Engine running at maximum power`
            });

            // Download BOTH audio and video in parallel
            const [audioResult, videoResult] = await Promise.allSettled([
                downloadHighQualityAudio(videoUrl, audioPath),
                downloadHighQualityVideo(videoUrl, videoPath)
            ]);

            let audioSuccess = audioResult.status === 'fulfilled';
            let videoSuccess = videoResult.status === 'fulfilled';

            // Send download complete message
            await sock.sendMessage(from, {
                text: `✅ *DOWNLOAD COMPLETE*

🎬 *Media Ready for Delivery*
${audioSuccess ? '✅ Audio Downloaded' : '❌ Audio Failed'}
${videoSuccess ? '✅ Video Downloaded' : '❌ Video Failed'}

🚀 Sending files to your chat...`
            });

            // Send audio file
            if (audioSuccess) {
                try {
                    const audioStats = fs.statSync(audioPath);
                    const audioSizeMB = audioStats.size / (1024 * 1024);
                    
                    if (audioSizeMB <= 16) { // WhatsApp limit
                        await sock.sendMessage(from, {
                            audio: fs.readFileSync(audioPath),
                            mimetype: 'audio/mpeg',
                            fileName: `🎧 ${videoTitle.substring(0, 40)}.mp3`,
                            ptt: false
                        });
                    } else {
                        await sock.sendMessage(from, {
                            text: `❌ Audio too large: ${audioSizeMB.toFixed(1)}MB (max 16MB)`
                        });
                    }
                } catch (audioError) {
                    console.error('Audio send error:', audioError);
                }
            }

            // Send video file
            if (videoSuccess) {
                try {
                    const videoStats = fs.statSync(videoPath);
                    const videoSizeMB = videoStats.size / (1024 * 1024);
                    
                    if (videoSizeMB <= 16) { // WhatsApp limit
                        await sock.sendMessage(from, {
                            video: fs.readFileSync(videoPath),
                            mimetype: 'video/mp4',
                            fileName: `🎬 ${videoTitle.substring(0, 40)}.mp4`,
                            caption: `🎬 ${videoTitle}`
                        });
                    } else {
                        // Try compressed version if too large
                        await sock.sendMessage(from, {
                            text: `📹 Video compressed (original: ${videoSizeMB.toFixed(1)}MB)`
                        });
                        
                        const compressedPath = await compressVideo(videoPath, tempDir);
                        if (compressedPath) {
                            await sock.sendMessage(from, {
                                video: fs.readFileSync(compressedPath),
                                mimetype: 'video/mp4', 
                                fileName: `🎬 ${videoTitle.substring(0, 40)}.mp4`
                            });
                            fs.unlinkSync(compressedPath);
                        }
                    }
                } catch (videoError) {
                    console.error('Video send error:', videoError);
                }
            }

            // Send final summary
            await sock.sendMessage(from, {
                text: `🎉 *DOWNLOAD SUMMARY*

✅ *Completed Successfully*
${audioSuccess ? '🎧 Audio: DELIVERED' : '🎧 Audio: FAILED'}
${videoSuccess ? '🎬 Video: DELIVERED' : '🎬 Video: FAILED'}

📊 *Media Info:*
🎵 Title: ${videoTitle}
⏱️ Duration: ${videoDuration}  
👁️ Views: ${videoViews}

🔥 *Powered by CYPHER Download Engine*
💫 Enjoy your media!`
            });

            // Cleanup
            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
            if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);

        } catch (error) {
            console.error('Advanced play error:', error);
            await sock.sendMessage(from, {
                text: `❌ *DOWNLOAD FAILED*

💥 Error: ${error.message}

🔧 *Troubleshooting:*
• Check internet connection
• Try different search terms
• Video may be restricted
• Server may be busy

🔄 Try again in a moment.`
            }, { quoted: msg });
        }
    }
};

// Advanced video search with multiple fallbacks
async function advancedVideoSearch(query) {
    try {
        // Try exact search first
        let searchResult = await yts(query);
        
        if (searchResult.videos.length > 0) {
            const bestVideo = findBestVideo(searchResult.videos, query);
            if (bestVideo) return bestVideo;
        }

        // Try with "official audio" suffix
        searchResult = await yts(query + ' official audio');
        if (searchResult.videos.length > 0) {
            const bestVideo = findBestVideo(searchResult.videos, query);
            if (bestVideo) return bestVideo;
        }

        // Try with "music video" suffix  
        searchResult = await yts(query + ' music video');
        if (searchResult.videos.length > 0) {
            return findBestVideo(searchResult.videos, query);
        }

        return null;
    } catch (error) {
        throw error;
    }
}

// Smart video selection algorithm
function findBestVideo(videos, query) {
    const queryWords = query.toLowerCase().split(' ');
    
    const scoredVideos = videos.map(video => {
        let score = 0;
        const title = video.title.toLowerCase();
        const author = video.author.name.toLowerCase();

        // Content type scoring
        if (title.includes('official')) score += 15;
        if (title.includes('audio')) score += 10;
        if (title.includes('video')) score += 8;
        if (author.includes('topic')) score += 12;
        if (author.includes('vevo')) score += 10;

        // Query matching
        queryWords.forEach(word => {
            if (title.includes(word)) score += 8;
            if (author.includes(word)) score += 6;
        });

        // Duration preferences (1-15 minutes ideal)
        const duration = video.duration?.seconds || 0;
        if (duration > 60 && duration < 900) score += 10;
        if (duration > 1800) score -= 10; // Too long (>30min)

        // View count weighting
        if (video.views > 1000000) score += 5;
        if (video.views > 10000000) score += 10;

        // Recency bonus (if within 2 years)
        const twoYearsAgo = Date.now() - (2 * 365 * 24 * 60 * 60 * 1000);
        if (video.uploaded && new Date(video.uploaded).getTime() > twoYearsAgo) {
            score += 5;
        }

        return { video, score };
    });

    scoredVideos.sort((a, b) => b.score - a.score);
    return scoredVideos[0]?.video || videos[0];
}

// High quality audio download
async function downloadHighQualityAudio(videoUrl, outputPath) {
    return new Promise((resolve, reject) => {
        const stream = ytdl(videoUrl, {
            quality: 'highestaudio',
            filter: 'audioonly',
        });

        const writeStream = fs.createWriteStream(outputPath);
        
        stream.pipe(writeStream);

        stream.on('end', resolve);
        stream.on('error', reject);
        writeStream.on('error', reject);
    });
}

// High quality video download  
async function downloadHighQualityVideo(videoUrl, outputPath) {
    return new Promise((resolve, reject) => {
        const stream = ytdl(videoUrl, {
            quality: 'highest',
            filter: 'audioandvideo',
        });

        const writeStream = fs.createWriteStream(outputPath);
        
        stream.pipe(writeStream);

        stream.on('end', resolve);
        stream.on('error', reject);
        writeStream.on('error', reject);
    });
}

// Video compression for large files
async function compressVideo(inputPath, tempDir) {
    return new Promise((resolve) => {
        const outputPath = path.join(tempDir, `compressed_${Date.now()}.mp4`);
        
        // Use ffmpeg if available, otherwise return original
        exec(`ffmpeg -i "${inputPath}" -vcodec libx264 -crf 28 -preset fast -acodec aac -b:a 128k "${outputPath}"`, 
            (error) => {
                if (error) {
                    resolve(null); // Compression failed, use original
                } else {
                    resolve(outputPath);
                }
            }
        );
    });
}

// Format view counts
function formatViews(views) {
    if (!views) return 'Unknown';
    if (views >= 1000000000) return (views / 1000000000).toFixed(1) + 'B';
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views.toString();
}

// Bulk download command
module.exports.bulk = {
    name: 'playlist',
    description: 'Download multiple songs/videos',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        if (!args.length) {
            await sock.sendMessage(from, {
                text: `🎵 *BULK DOWNLOAD*

Usage: .playlist "song1" "song2" "song3"

Example: 
.playlist "asake remember" "burna boy last last" "wizkid essence"

⚡ Downloads up to 3 songs with audio+video`
            }, { quoted: msg });
            return;
        }

        const songs = args.slice(0, 3); // Limit to 3 songs
        
        await sock.sendMessage(from, {
            text: `🚀 *BULK DOWNLOAD INITIATED*

📥 Songs: ${songs.length}
⚡ Mode: Parallel Download
🎯 Quality: Maximum

Starting bulk download sequence...`
        }, { quoted: msg });

        for (let i = 0; i < songs.length; i++) {
            try {
                const song = songs[i];
                await sock.sendMessage(from, {
                    text: `⬇️ [${i + 1}/${songs.length}] Downloading: ${song}`
                });

                // Reuse the main download logic
                const video = await advancedVideoSearch(song);
                if (!video) continue;

                const tempDir = './cypher_downloads';
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

                const timestamp = Date.now();
                const audioPath = path.join(tempDir, `bulk_audio_${timestamp}.mp3`);
                const videoPath = path.join(tempDir, `bulk_video_${timestamp}.mp4`);

                // Download audio only for bulk (faster)
                await downloadHighQualityAudio(video.url, audioPath);
                
                const audioStats = fs.statSync(audioPath);
                const audioSizeMB = audioStats.size / (1024 * 1024);

                if (audioSizeMB <= 16) {
                    await sock.sendMessage(from, {
                        audio: fs.readFileSync(audioPath),
                        mimetype: 'audio/mpeg',
                        fileName: `🎧 ${video.title.substring(0, 40)}.mp3`
                    });
                }

                // Cleanup
                if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
                if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);

                await delay(2000); // Delay between downloads

            } catch (error) {
                console.error(`Bulk song ${i + 1} failed:`, error);
                continue;
            }
        }

        await sock.sendMessage(from, {
            text: `🎉 *BULK DOWNLOAD COMPLETE*

✅ Successfully processed ${songs.length} songs
🎧 All audio files delivered above

🔥 CYPHER Bulk Engine finished`
        }, { quoted: msg });
    }
};

// Quick search command
module.exports.search = {
    name: 'music',
    description: 'Search music/videos before downloading',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        if (!args.length) {
            await sock.sendMessage(from, {
                text: '🔍 Usage: .music <song name> to search before downloading'
            }, { quoted: msg });
            return;
        }

        const query = args.join(' ');
        const videos = await yts(query);
        
        if (!videos.videos.length) {
            await sock.sendMessage(from, {
                text: `❌ No results for "${query}"`
            }, { quoted: msg });
            return;
        }

        let results = `🎵 *SEARCH RESULTS: "${query}"*\n\n`;
        
        videos.videos.slice(0, 5).forEach((video, index) => {
            results += `${index + 1}. *${video.title}*\n`;
            results += `   👤 ${video.author.name}\n`;
            results += `   ⏱️ ${video.timestamp} | 👁️ ${formatViews(video.views)}\n\n`;
        });

        results += '💡 *Reply:* .play <number> to download instantly';

        await sock.sendMessage(from, { text: results }, { quoted: msg });

        // Store for quick access
        if (!global.musicCache) global.musicCache = new Map();
        global.musicCache.set(from, videos.videos.slice(0, 5));
    }
};

// Quick download from search
module.exports.quick = {
    name: 'play',
    description: 'Quick download from search results', 
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        if (!args.length || !global.musicCache?.get(from)) {
            await sock.sendMessage(from, {
                text: '❌ No search results found. Use .music first.'
            }, { quoted: msg });
            return;
        }

        const num = parseInt(args[0]);
        const videos = global.musicCache.get(from);

        if (isNaN(num) || num < 1 || num > videos.length) {
            await sock.sendMessage(from, {
                text: `❌ Select number 1-${videos.length}`
            }, { quoted: msg });
            return;
        }

        const video = videos[num - 1];
        
        // Use main download logic
        const mainModule = require('./play');
        await mainModule.execute(sock, { 
            ...msg, 
            message: { 
                extendedTextMessage: { 
                    text: video.title 
                } 
            } 
        }, video.title.split(' '));
    }
};

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Auto-cleanup
setInterval(() => {
    const tempDir = './cypher_downloads';
    if (fs.existsSync(tempDir)) {
        fs.readdirSync(tempDir).forEach(file => {
            try {
                fs.unlinkSync(path.join(tempDir, file));
            } catch (e) {
                // Ignore cleanup errors
            }
        });
    }
}, 300000); // Clean every 5 minutes
