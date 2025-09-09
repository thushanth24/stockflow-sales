import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');

// Icon sizes needed for PWA
const iconSizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 167, name: 'apple-touch-icon-167x167.png' },
  { size: 180, name: 'apple-touch-icon-180x180.png' },
  { size: 192, name: 'pwa-192x192.png' },
  { size: 512, name: 'pwa-512x512.png' }
];

async function generateIcons() {
  try {
    console.log('🎨 Generating PWA icons from SVG...');
    
    // Read the SVG file
    const svgPath = path.join(publicDir, 'icon.svg');
    if (!fs.existsSync(svgPath)) {
      console.error('❌ SVG icon file not found at:', svgPath);
      return;
    }

    const svgBuffer = fs.readFileSync(svgPath);
    
    // Generate all icon sizes
    for (const icon of iconSizes) {
      const outputPath = path.join(publicDir, icon.name);
      
      await sharp(svgBuffer)
        .resize(icon.size, icon.size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${icon.name} (${icon.size}x${icon.size})`);
    }

    // Generate apple-touch-icon.png (default 180x180)
    const defaultAppleIconPath = path.join(publicDir, 'apple-touch-icon.png');
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(defaultAppleIconPath);
    
    console.log('✅ Generated apple-touch-icon.png (180x180)');

    // Generate favicon.ico (16x16)
    const faviconPath = path.join(publicDir, 'favicon.ico');
    await sharp(svgBuffer)
      .resize(16, 16)
      .png()
      .toFile(faviconPath);
    
    console.log('✅ Generated favicon.ico (16x16)');

    console.log('');
    console.log('🎉 All PWA icons generated successfully!');
    console.log('📱 Your PWA should now install properly on iOS Safari');
    console.log('');
    console.log('🔄 Next steps:');
    console.log('1. Run: npm run build');
    console.log('2. Test PWA installation on your device');
    console.log('3. The app should now show as "Delete App" instead of "Delete Bookmark"');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
  }
}

generateIcons();
