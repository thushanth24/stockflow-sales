import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting HTTPS tunnel for PWA testing...');
console.log('📱 This will allow iOS Safari to properly test PWA features');
console.log('');

// Check if ngrok is installed
const checkNgrok = () => {
  return new Promise((resolve) => {
    const ngrok = spawn('ngrok', ['--version'], { stdio: 'pipe' });
    ngrok.on('close', (code) => {
      resolve(code === 0);
    });
  });
};

// Start ngrok tunnel
const startTunnel = async () => {
  const hasNgrok = await checkNgrok();
  
  if (!hasNgrok) {
    console.log('❌ ngrok is not installed!');
    console.log('');
    console.log('📥 Install ngrok:');
    console.log('   npm install -g ngrok');
    console.log('   or download from: https://ngrok.com/download');
    console.log('');
    console.log('🔄 Alternative: Deploy to a HTTPS hosting service like:');
    console.log('   - Vercel: https://vercel.com');
    console.log('   - Netlify: https://netlify.com');
    console.log('   - GitHub Pages: https://pages.github.com');
    return;
  }

  console.log('✅ ngrok found, starting tunnel...');
  console.log('');
  
  // Start ngrok tunnel on port 4173 (default preview port)
  const ngrok = spawn('ngrok', ['http', '4173'], { stdio: 'pipe' });
  
  ngrok.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('https://')) {
      const lines = output.split('\n');
      const httpsLine = lines.find(line => line.includes('https://'));
      if (httpsLine) {
        const url = httpsLine.split('https://')[1]?.split(' ')[0];
        if (url) {
          console.log('🌐 HTTPS URL for PWA testing:');
          console.log(`   https://${url}`);
          console.log('');
          console.log('📱 Use this URL on your iOS device to test PWA installation');
          console.log('⚠️  Note: ngrok URLs are temporary and change each time');
        }
      }
    }
  });
  
  ngrok.stderr.on('data', (data) => {
    console.error('ngrok error:', data.toString());
  });
  
  ngrok.on('close', (code) => {
    console.log(`ngrok tunnel closed with code ${code}`);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping ngrok tunnel...');
    ngrok.kill();
    process.exit(0);
  });
};

startTunnel();
