const fs = require('fs');
const https = require('https');

const url = 'https://www.lotteryusa.com/powerball/';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let html = '';

  res.on('data', chunk => { html += chunk; });
  res.on('end', () => {
    try {
      // Match numbers like <span class="result">12</span>
      const matches = [...html.matchAll(/<span class="result">(\d+)<\/span>/g)];
      if (matches.length < 6) throw new Error('Not enough numbers found');

      const numbers = matches.map(m => m[1]);
      const drawDateMatch = html.match(/<time datetime="([^"]+)"/);
      const drawDate = drawDateMatch ? drawDateMatch[1] : 'Unknown date';

      // Look for Power Play info
      const powerPlayMatch = html.match(/Power Play:?<\/strong>\s*(\d+[xX])/);
      const powerPlay = powerPlayMatch ? powerPlayMatch[1] : '';

      const result = {
        drawDate,
        numbers,
        powerPlay,
        source: url,
        updated: new Date().toISOString()
      };

      fs.writeFileSync('results.json', JSON.stringify(result, null, 2));
      console.log('✅ results.json updated:', result);
    } catch (err) {
      console.error('❌ Error scraping Powerball page:', err.message);
      const fallback = {
        drawDate: 'Waiting for latest draw',
        numbers: ['-', '-', '-', '-', '-', '-'],
        powerPlay: '-',
        source: url,
        updated: new Date().toISOString()
      };
      fs.writeFileSync('results.json', JSON.stringify(fallback, null, 2));
    }
  });
}).on('error', err => {
  console.error('Network error:', err.message);
});
