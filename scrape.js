const fs = require('fs');
const https = require('https');

const url = 'https://www.powerball.com/api/v1/numbers/powerball/recent?_format=json';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';

  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      if (!data) throw new Error('Empty response');
      const jsonArray = JSON.parse(data);
      if (!Array.isArray(jsonArray) || jsonArray.length === 0) throw new Error('No data in response');

      const json = jsonArray[0];
      const result = {
        drawDate: json.field_draw_date,
        numbers: json.field_winning_numbers.split(' ').map(n => n.trim()),
        powerPlay: json.field_multiplier || '',
        source: 'https://www.powerball.com/',
        updated: new Date().toISOString()
      };

      fs.writeFileSync('results.json', JSON.stringify(result, null, 2));
      console.log('✅ results.json updated:', result);
    } catch (err) {
      console.error('Error parsing JSON:', err.message);
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
  console.error('Error fetching data:', err.message);
});
