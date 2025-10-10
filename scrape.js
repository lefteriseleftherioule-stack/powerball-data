const puppeteer = require('puppeteer');

async function scrapePowerball() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Attempt to scrape the official Powerball site
    await page.goto('https://www.powerball.com/');
    await page.waitForSelector('.powerball-results__ball', { timeout: 30000 });

    const numbers = await page.evaluate(() => {
      const balls = Array.from(document.querySelectorAll('.powerball-results__ball'));
      const powerPlay = document.querySelector('.powerball-results__multiplier')?.textContent.trim() || 'N/A';
      return {
        numbers: balls.slice(0, 5).map(ball => ball.textContent.trim()),
        powerPlay
      };
    });

    if (numbers.numbers.length === 5) {
      console.log('Scraped from Powerball.com:', numbers);
    } else {
      throw new Error('Incomplete data from Powerball.com');
    }
  } catch (error) {
    console.error('Error scraping Powerball.com:', error.message);

    // Fallback to LotteryUSA
    try {
      await page.goto('https://www.lotteryusa.com/powerball/');
      await page.waitForSelector('.lotteryusa-result-ball', { timeout: 30000 });

      const numbers = await page.evaluate(() => {
        const balls = Array.from(document.querySelectorAll('.lotteryusa-result-ball'));
        const powerPlay = document.querySelector('.lotteryusa-result-powerplay')?.textContent.trim() || 'N/A';
        return {
          numbers: balls.slice(0, 5).map(ball => ball.textContent.trim()),
          powerPlay
        };
      });

      if (numbers.numbers.length === 5) {
        console.log('Scraped from LotteryUSA:', numbers);
      } else {
        throw new Error('Incomplete data from LotteryUSA');
      }
    } catch (error) {
      console.error('Error scraping LotteryUSA:', error.message);
    }
  }

  await browser.close();
}

scrapePowerball();
