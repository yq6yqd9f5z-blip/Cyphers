const axios = require('axios');

module.exports = {
    name: 'instagram',
    description: 'Download Instagram videos and photos',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            const url = args[0];

            if (url && url.includes('instagram.com')) {
                await sock.sendMessage(from, { 
                    text: '📥 Downloading Instagram media...' 
                }, { quoted: msg });

                const mediaData = await downloadInstagram(url);
                
                if (mediaData && mediaData.url) {
                    if (mediaData.type === 'video') {
                        await sock.sendMessage(from, { 
                            video: { url: mediaData.url },
                            caption: mediaData.caption || '📹 Instagram Video'
                        }, { quoted: msg });
                    } else if (mediaData.type === 'image') {
                        await sock.sendMessage(from, { 
                            image: { url: mediaData.url },
                            caption: mediaData.caption || '🖼️ Instagram Photo'
                        }, { quoted: msg });
                    } else if (mediaData.type === 'carousel') {
                        // Send first image of carousel
                        await sock.sendMessage(from, { 
                            image: { url: mediaData.urls[0] },
                            caption: '🖼️ Instagram Post (Carousel)'
                        }, { quoted: msg });
                    }
                } else {
                    await sock.sendMessage(from, { 
                        text: '❌ Failed to download Instagram media. Link may be private or invalid.' 
                    }, { quoted: msg });
                }
                return;
            }

            await sock.sendMessage(from, { 
                text: '📸 *Instagram Downloader*\n\nUsage: .instagram <link>\n\nExamples:\n.instagram https://www.instagram.com/p/ABC123/\n.instagram https://instagram.com/reel/XYZ456/\n.instagram https://www.instagram.com/stories/username/123456/' 
            }, { quoted: msg });

        } catch (error) {
            console.error('Instagram command error:', error);
            await sock.sendMessage(from, { 
                text: '❌ Error downloading Instagram media. Please check the link.' 
            }, { quoted: msg });
        }
    }
};

async function downloadInstagram(url) {
    const methods = [
        downloadInstagramMethod1,
        downloadInstagramMethod2,
        downloadInstagramMethod3
    ];

    for (const method of methods) {
        try {
            console.log(`Trying Instagram method: ${method.name}`);
            const result = await method(url);
            if (result && result.url) {
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

// Method 1: Instagram Downloader API
async function downloadInstagramMethod1(url) {
    try {
        const apiUrl = `https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index?url=${encodeURIComponent(url)}`;
        
        const response = await axios.get(apiUrl, {
            timeout: 20000,
            headers: {
                'X-RapidAPI-Key': 'your-api-key-here', // You can get free key from rapidapi.com
                'X-RapidAPI-Host': 'instagram-downloader-download-instagram-videos-stories.p.rapidapi.com'
            }
        });

        const data = response.data;
        
        if (data.media) {
            return {
                type: data.mediaType === 'Video' ? 'video' : 'image',
                url: data.media,
                caption: data.title
            };
        }
        
        throw new Error('No media found');
    } catch (error) {
        throw new Error('API method failed');
    }
}

// Method 2: Alternative Instagram API
async function downloadInstagramMethod2(url) {
    try {
        const apiUrl = `https://instagram-scraper-api2.p.rapidapi.com/v1/media_info?url=${encodeURIComponent(url)}`;
        
        const response = await axios.get(apiUrl, {
            timeout: 20000,
            headers: {
                'X-RapidAPI-Key': 'your-api-key-here',
                'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com'
            }
        });

        const media = response.data?.data;
        
        if (media?.is_video && media.video_versions?.[0]?.url) {
            return {
                type: 'video',
                url: media.video_versions[0].url,
                caption: media.caption?.text
            };
        } else if (media?.image_versions2?.candidates?.[0]?.url) {
            return {
                type: 'image',
                url: media.image_versions2.candidates[0].url,
                caption: media.caption?.text
            };
        } else if (media?.carousel_media) {
            const urls = media.carousel_media.map(item => 
                item.video_versions?.[0]?.url || item.image_versions2?.candidates?.[0]?.url
            ).filter(Boolean);
            
            return {
                type: 'carousel',
                urls: urls,
                caption: media.caption?.text
            };
        }
        
        throw new Error('No media data found');
    } catch (error) {
        throw new Error('Alternative API failed');
    }
}

// Method 3: Free Instagram Downloader (No API Key Required)
async function downloadInstagramMethod3(url) {
    try {
        const apiUrl = `https://igram.io/api/ig?url=${encodeURIComponent(url)}`;
        
        const response = await axios.get(apiUrl, {
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const data = response.data;
        
        if (data.video) {
            return {
                type: 'video',
                url: data.video,
                caption: data.caption
            };
        } else if (data.image) {
            return {
                type: 'image',
                url: data.image,
                caption: data.caption
            };
        } else if (data.images && data.images.length > 0) {
            return {
                type: 'carousel',
                urls: data.images,
                caption: data.caption
            };
        }
        
        throw new Error('No media in response');
    } catch (error) {
        throw new Error('Free API failed');
    }
}

// Method 4: Direct Instagram Scraper (Fallback)
async function downloadInstagramMethod4(url) {
    try {
        // Simple web scraper approach
        const response = await axios.get(url, {
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const html = response.data;
        
        // Extract video URL
        const videoMatch = html.match(/"video_url":"([^"]+)"/);
        if (videoMatch && videoMatch[1]) {
            return {
                type: 'video',
                url: videoMatch[1].replace(/\\u0026/g, '&')
            };
        }
        
        // Extract image URL
        const imageMatch = html.match(/"display_url":"([^"]+)"/);
        if (imageMatch && imageMatch[1]) {
            return {
                type: 'image',
                url: imageMatch[1].replace(/\\u0026/g, '&')
            };
        }
        
        throw new Error('No media found in page');
    } catch (error) {
        throw new Error('Direct scraping failed');
    }
}
