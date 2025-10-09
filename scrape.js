import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

const POWERBALL_URL = "https://www.powerball.com/games/powerball";

async function scrapePowerball() {
  try {
    const response = await fetch(POWERBALL_URL);
    const html = await response.text();
    const $ = cheerio.load(html);

    // The current Powerball site places numbers inside divs with class "winning-number"
    const numbers = [];
    $("div.winning-number").each((i, el) => {
      numbers.push($(el).text().trim());
    });

    // Powerball site also shows Power Play separately
    const powerPlay = $("div.powerplay span").first().text().trim() || "-";

    // Extract the draw date
    const drawDate = $("span.draw-date, div.draw-date, h5:contains('Drawing Date')")
      .first()
      .text()
      .trim()
      .replace("Drawing Date: ", "") || "Waiting for latest draw";

    if (numbers.length < 6) throw new Error("Not enough numbers found");

    const result = {
      drawDate,
      numbers,
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
