const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    name: '3d',
    description: 'Create 3D text images',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            const text = args.join(' ');
            
            if (!text) {
                await sock.sendMessage(from, { 
                    text: '❌ Please provide text\n\n💡 Usage: .3d <text>\n\n📝 Examples:\n.3d Hello\n.3d Cyber Cyphers\n.3d WhatsApp Bot' 
                }, { quoted: msg });
                return;
            }

            if (text.length > 50) {
                await sock.sendMessage(from, { 
                    text: '❌ Text too long! Maximum 50 characters.' 
                }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, { 
                text: '🎨 Creating 3D text image...' 
            }, { quoted: msg });

            // Create 3D image
            const imageBuffer = await create3DText(text);
            
            if (!imageBuffer) {
                await sock.sendMessage(from, { 
                    text: '❌ Failed to create 3D image' 
                }, { quoted: msg });
                return;
            }

            // Send the image
            await sock.sendMessage(from, { 
                image: imageBuffer,
                caption: `🔄 3D Text: "${text}"` 
            }, { quoted: msg });

            console.log(`✅ Created 3D text: ${text}`);

        } catch (error) {
            console.error('3D command error:', error);
            await sock.sendMessage(from, { 
                text: `❌ Error creating 3D image: ${error.message}` 
            }, { quoted: msg });
        }
    }
};

async function create3DText(text) {
    // Canvas dimensions
    const width = 800;
    const height = 400;
    
    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Text style
    const fontSize = Math.min(80, Math.max(30, 80 - (text.length * 1.5)));
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Calculate text position
    const x = width / 2;
    const y = height / 2;

    // 3D effect - draw multiple layers with offset
    const depth = 8;
    
    // Shadow layers (creates 3D depth)
    for (let i = depth; i > 0; i--) {
        const offset = i * 1.5;
        ctx.fillStyle = `rgba(0, 150, 255, ${0.1 + (i * 0.05)})`;
        ctx.fillText(text, x + offset, y + offset);
    }

    // Main text with gradient
    const textGradient = ctx.createLinearGradient(x - 200, y - 50, x + 200, y + 50);
    textGradient.addColorStop(0, '#00ffff');
    textGradient.addColorStop(0.5, '#ff00ff');
    textGradient.addColorStop(1, '#ffff00');
    
    ctx.fillStyle = textGradient;
    ctx.fillText(text, x, y);

    // Add border to main text
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeText(text, x, y);

    // Add shine effect
    const shineGradient = ctx.createLinearGradient(x - 100, y - 50, x + 100, y + 50);
    shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
    
    ctx.fillStyle = shineGradient;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillText(text, x, y);
    ctx.globalCompositeOperation = 'source-over';

    // Add floating particles for 3D effect
    addFloatingParticles(ctx, width, height);

    // Add reflection
    addReflection(ctx, text, x, y, fontSize);

    // Convert to buffer
    return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}

function addFloatingParticles(ctx, width, height) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 3 + 1;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function addReflection(ctx, text, x, y, fontSize) {
    ctx.save();
    
    // Reflection position
    const reflectionY = y + fontSize + 20;
    
    // Reflection gradient
    const reflectionGradient = ctx.createLinearGradient(x, y + fontSize, x, reflectionY + 50);
    reflectionGradient.addColorStop(0, 'rgba(0, 150, 255, 0.6)');
    reflectionGradient.addColorStop(1, 'rgba(0, 150, 255, 0)');
    
    ctx.fillStyle = reflectionGradient;
    ctx.globalAlpha = 0.4;
    
    // Scale and draw reflection
    ctx.translate(x, reflectionY);
    ctx.scale(1, -0.4);
    ctx.translate(-x, -reflectionY);
    
    ctx.fillText(text, x, reflectionY);
    
    ctx.restore();
}

// Alternative 3D style with different effect
async function create3DTextAlternative(text) {
    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Text style
    const fontSize = Math.min(70, Math.max(25, 70 - (text.length * 1.2)));
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const x = width / 2;
    const y = height / 2;

    // 3D extrusion effect
    const depth = 12;
    
    // Dark shadow layers
    for (let i = depth; i > 0; i--) {
        ctx.fillStyle = `rgba(50, 50, 150, ${0.8 - (i * 0.06)})`;
        ctx.fillText(text, x + i, y + i);
    }

    // Main text with metallic gradient
    const metalGradient = ctx.createLinearGradient(x - 150, y - 40, x + 150, y + 40);
    metalGradient.addColorStop(0, '#b8b8b8');
    metalGradient.addColorStop(0.3, '#ffffff');
    metalGradient.addColorStop(0.7, '#888888');
    metalGradient.addColorStop(1, '#cccccc');
    
    ctx.fillStyle = metalGradient;
    ctx.fillText(text, x, y);

    // Add highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeText(text, x, y);

    return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}
