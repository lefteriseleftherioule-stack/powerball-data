import fetch from 'node-fetch';
import cheerio from 'cheerio';
import fs from 'fs';

const url = 'https://www.powerball.com/games/home';

async function scrapePowerball() {
  try {
    console.log(`Fetching ${url}`);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
    });

    const html = await res.text();
    const $ = cheerio.load(html);

    const numbers = [];
    $('.winning-number').each((i, el) => {
      numbers.push($(el).text().trim());
    });

    const drawDate = $('.date').first().text().trim() || 'Unknown draw date';
    const powerPlay = $('.multiplier').first().text().trim() || '-';

    if (numbers.length < 6) throw new Error('Not enough numbers found on page');

    const data = {
      drawDate,
      numbers,
      powerPlay,
      source: url,
      updated: new Date().toISOString(),
    };

    fs.writeFileSync('results.json', JSON.stringify(data, null, 2));
    console.log('✅ Successfully wrote results.json');
    console.log(data);

  } catch (err) {
    console.error('❌ Error scraping Powerball:', err.message);

    const fallback = {
      drawDate: 'Error fetching draw',
      numbers: ['-', '-', '-', '-', '-', '-'],
      powerPlay: '-',
      source: url,
      updated: new Date().toISOString(),
    };
    fs.writeFileSync('results.json', JSON.stringify(fallback, null, 2));
  }
}

scrapePowerball();
