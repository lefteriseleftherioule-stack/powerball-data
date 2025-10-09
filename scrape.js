import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

const POWERBALL_URL = "https://www.powerball.com/";

async function scrapePowerball() {
  try {
    const response = await fetch(POWERBALL_URL);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Example structure as of 2025 — adjust selector if Powerball changes layout
    const drawDate = $(".game-draw-date").first().text().trim() || "Waiting for latest draw";

    const numbers = [];
    $(".white-ball").each((i, el) => {
      numbers.push($(el).text().trim());
    });

    const powerBall = $(".powerball").first().text().trim() || "-";
    const powerPlay = $(".powerplay").first().text().trim() || "-";

    if (numbers.length < 5) throw new Error("Not enough numbers found");

    const result = {
      drawDate,
      numbers: [...numbers.slice(0, 5), powerBall],
      powerPlay,
      source: POWERBALL_URL,
      updated: new Date().toISOString(),
    };

    fs.writeFileSync("results.json", JSON.stringify(result, null, 2));
    console.log("✅ Powerball results updated:", result);
  } catch (error) {
    console.error("❌ Error scraping Powerball page:", error.message);
  }
}

scrapePowerball();
