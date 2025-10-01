const pngToIco = require('png-to-ico');
const fs = require('fs');

async function convertIcon() {
  try {
    console.log('Converting logo.png to icon.ico...');
    const buf = await pngToIco('logo.png');
    fs.writeFileSync('icon.ico', buf);
    console.log('✓ Icon created successfully: icon.ico');
  } catch (err) {
    console.error('Error:', err);
  }
}

convertIcon();
