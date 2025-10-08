const fs = require('fs');
const https = require('https');

const url = 'https://www.powerball.com/';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let html = '';

  res.on('data', chunk => { html += chunk; });
  res.on('end', () => {
    try {
      // Find the winning numbers section
      const numbersMatch = html.match(/<ul class="winning-numbers">\s*([\s\S]*?)<\/ul>/);
      if (!numbersMatch) throw new Error('Numbers not found');

      const numbersHtml = numbersMatch[1];
      const numMatches = [...numbersHtml.matchAll(/<li.*?>(\d+)<\/li>/g)];
      if (!numMatches || numMatches.length === 0) throw new Error('No numbers found');

      // Extract numbers as array of strings
      const numbers = numMatches.map(m => m[1]);

      // Extract draw date
      const dateMatch = html.match(/<p class="date">Winning Numbers for (.*?)<\/p>/);
      const drawDate = dateMatch ? dateMatch[1] : 'Unknown';

      // Extract Power Play
      const ppMatch = html.match(/<li class="powerball">\s*(\d+)\s*<\/li>/);
      const powerPlay = ppMatch ? ppMatch[1] : '';

      const result = {
        drawDate,
        numbers,
        powerPlay,
        source: 'https://www.powerball.com/',
        updated: new Date().toISOString()
      };

      fs.writeFileSync('results.json', JSON.stringify(result, null, 2));
      console.log('results.json updated:', result);

    } catch (err) {
      console.error('Error scraping Powerball page:', err.message);
      // fallback: create placeholder JSON so workflow doesn't fail
      const fallback = {
        drawDate: 'Waiting for latest draw',
        numbers: ['-', '-', '-', '-', '-', '-'],
        powerPlay: '-',
        source: 'https://www.powerball.com/',
        updated: new Date().toISOString()
      };
      fs.writeFileSync('results.json', JSON.stringify(fallback, null, 2));
    }
  });
}).on('error', err => {
  console.error('Error fetching page:', err.message);
  const fallback = {
    drawDate: 'Waiting for latest draw',
    numbers: ['-', '-', '-', '-', '-', '-'],
    powerPlay: '-',
    source: 'https://www.powerball.com/',
    updated: new Date().toISOString()
  };
  fs.writeFileSync('results.json', JSON.stringify(fallback, null, 2));
});
