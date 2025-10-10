import puppeteer from "puppeteer";
import fs from "fs";

async function scrapePowerball() {
  const url = "https://www.powerball.com/";
  console.log("Launching Puppeteer...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    console.log("Opening Powerball page:", url);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Wait for the Powerball numbers to appear
    await page.waitForSelector(".powerball-results__ball", { timeout: 30000 });

    const data = await page.evaluate(() => {
      const balls = Array.from(document.querySelectorAll(".powerball-results__ball"))
        .map(el => el.textContent.trim())
        .filter(n => n !== "");

      const powerPlay = document.querySelector(".powerball-results__powerplay")?.textContent?.trim() || "-";
      const drawDate = document.querySelector(".powerball-results__date")?.textContent?.trim() || "Unknown Date";

      return { balls, powerPlay, drawDate };
    });

    const result = {
      drawDate: data.drawDate,
      numbers: data.balls,
      powerPlay: data.powerPlay,
      source: url,
      updated: new Date().toISOString(),
    };

    fs.writeFileSync("results.json", JSON.stringify(result, null, 2));
    console.log("✅ Wrote results.json:", result);
  } catch (err) {
    console.error("❌ Error scraping Powerball:", err);
    const fallback = {
      drawDate: "Waiting for latest draw",
      numbers: ["-", "-", "-", "-", "-", "-"],
      powerPlay: "-",
      source: url,
      updated: new Date().toISOString(),
    };
    fs.writeFileSync("results.json", JSON.stringify(fallback, null, 2));
  } finally {
    await browser.close();
  }
}

scrapePowerball();
