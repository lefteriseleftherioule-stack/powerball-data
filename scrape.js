const fs = require('fs');
const https = require('https');

// Official Powerball JSON feed
const url = 'https://www.powerball.com/api/v1/numbers/powerball/recent?_limit=1';

https.get(url, (res) => {
  let data = '';

  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data)[0];

      // Format numbers and powerplay
      const result = {
        drawDate: json.field_draw_date,
        numbers: [...json.field_winning_numbers.split(' ').map(n => n.trim())],
        powerPlay: json.field_multiplier || '',
        source: 'https://www.powerball.com/',
        updated: new Date().toISOString()
      };

      fs.writeFileSync('results.json', JSON.stringify(result, null, 2));
      console.log('results.json updated:', result);
    } catch (err) {
      console.error('Error parsing JSON:', err);
    }
  });
}).on('error', err => {
  console.error('Error fetching data:', err);
});
