import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple SVG icon generator
function createSVGIcon(size, color = '#e87c3e') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#121212"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="${color}" stroke="#ffffff" stroke-width="2"/>
    <text x="${size/2}" y="${size/2 + size/20}" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="${size/8}" font-weight="bold">K</text>
  </svg>`;
}

// Create a simple PNG-like icon using canvas (Node.js doesn't have canvas by default, so we'll create SVG)
function createIcon(size) {
  const svg = createSVGIcon(size);
  return svg;
}

// Create the public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate icons
const sizes = [192, 512];
sizes.forEach(size => {
  const svg = createIcon(size);
  const filename = `pwa-${size}x${size}.png`;
  const filepath = path.join(publicDir, filename);
  
  // For now, we'll create SVG files and you can convert them to PNG manually
  // or use an online converter
  const svgFilename = `pwa-${size}x${size}.svg`;
  const svgFilepath = path.join(publicDir, svgFilename);
  
  fs.writeFileSync(svgFilepath, svg);
  console.log(`Created ${svgFilename}`);
});

// Create favicon
const faviconSvg = createIcon(32);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);
console.log('Created favicon.svg');

// Create apple-touch-icon
const appleIconSvg = createIcon(180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.svg'), appleIconSvg);
console.log('Created apple-touch-icon.svg');

console.log('\n✅ PWA icons generated!');
console.log('📝 Note: You may want to convert the SVG files to PNG for better compatibility.');
console.log('🔗 You can use online tools like https://convertio.co/svg-png/ to convert them.');
