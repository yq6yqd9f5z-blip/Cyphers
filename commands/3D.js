const { createCanvas } = require('canvas');
const path = require('path');

module.exports = {
    name: '3d',
    description: 'Create 3D text images',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            const text = args.join(' ');
            
            if (!text) {
                return; // No response for invalid command
            }

            if (text.length > 30) {
                return; // No response for long text
            }

            // Create 3D image silently
            const imageBuffer = await create3DText(text);
            
            if (imageBuffer) {
                // Send only the image, no caption
                await sock.sendMessage(from, { 
                    image: imageBuffer
                }, { quoted: msg });
            }

        } catch (error) {
            // Silent fail - no error messages
            console.error('3D command error:', error);
        }
    }
};

async function create3DText(text) {
    // High resolution canvas
    const width = 1200;
    const height = 600;
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Dark cosmic background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.5, '#0a0a2a');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 2;
        ctx.fillRect(x, y, size, size);
    }

    // Text configuration
    const fontSize = Math.min(120, Math.max(60, 120 - (text.length * 3)));
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const x = width / 2;
    const y = height / 2;

    // 3D Depth effect - multiple layers
    const depth = 15;
    
    // Deep shadow layers for 3D effect
    for (let i = depth; i > 0; i--) {
        const offset = i * 2.5;
        const alpha = 0.1 + (i * 0.04);
        ctx.fillStyle = `rgba(0, 100, 255, ${alpha})`;
        ctx.fillText(text, x + offset, y + offset);
    }

    // Main text with neon gradient
    const neonGradient = ctx.createLinearGradient(x - 300, y - 100, x + 300, y + 100);
    neonGradient.addColorStop(0, '#00ffff');
    neonGradient.addColorStop(0.3, '#ff00ff');
    neonGradient.addColorStop(0.6, '#ffff00');
    neonGradient.addColorStop(1, '#00ff00');
    
    ctx.fillStyle = neonGradient;
    ctx.fillText(text, x, y);

    // Glow effect
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);
    ctx.shadowBlur = 0;

    // Metallic border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeText(text, x, y);

    // Inner shine
    const shineGradient = ctx.createLinearGradient(x - 150, y - 75, x + 150, y + 75);
    shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = shineGradient;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillText(text, x, y);
    ctx.globalCompositeOperation = 'source-over';

    return canvas.toBuffer('image/jpeg', { quality: 1.0 });
}
