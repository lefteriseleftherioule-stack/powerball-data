import puppeteer from 'puppeteer';
import fs from 'fs';

async function scrapePowerball() {
  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const url = 'https://www.powerball.com/';
  console.log(`Opening Powerball page: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  try {
    // Wait for the balls to appear — official site uses this selector
    await page.waitForSelector('.powerball-results__ball', { timeout: 30000 });

    const data = await page.evaluate(() => {
      const balls = Array.from(document.querySelectorAll('.powerball-results__ball'))
        .map(b => b.textContent.trim())
        .filter(n => n && /^\d+$/.test(n));

      const powerPlay = document.querySelector('.powerball-results__powerplay')?.textContent?.trim() || '-';
      const drawDate = document.querySelector('.powerball-results__date')?.textContent?.trim() || 'Unknown';

      return { balls, powerPlay, drawDate };
    });

    if (data.balls.length < 6) throw new Error('Not enough numbers found');

    const results = {
      drawDate: data.drawDate,
      numbers: data.balls.slice(0, 5),
      powerball: data.balls[5],
      powerPlay: data.powerPlay,
      source: url,
      updated: new Date().toISOString()
    };

    fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
    console.log("✅ Scraped successfully:", results);

  } catch (err) {
    console.error("❌ Error scraping Powerball:", err.message);
  } finally {
    await browser.close();
  }
}

scrapePowerball();
