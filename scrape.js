import fs from "fs";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

async function scrapePowerball() {
  const url = "https://www.powerball.com/";

  try {
    console.log("Fetching Powerball data...");
    const response = await fetch(url);
    const html = await response.text();

    const $ = cheerio.load(html);

    // Try to extract numbers — Powerball sometimes uses different classes
    let numbers = [];
    $(".white-ball").each((_, el) => numbers.push($(el).text().trim()));

    const powerball = $(".powerball").first().text().trim() || "-";
    const powerPlay =
      $(".powerplay").first().text().trim() ||
      $(".multiplier").first().text().trim() ||
      "-";

    const drawDate =
      $(".draw-date")
        .first()
        .text()
        .replace("Drawing Date:", "")
        .trim() || "Unknown";

    if (numbers.length < 5) {
      console.error("❌ Error scraping Powerball page: Not enough numbers found");
      throw new Error("Not enough numbers found");
    }

    const result = {
      drawDate,
      numbers,
      powerball,
      powerPlay,
      source: url,
      updated: new Date().toISOString(),
    };

    fs.writeFileSync("results.json", JSON.stringify(result, null, 2));
    console.log("✅ Powerball results updated successfully");
    console.log(result);
  } catch (error) {
    console.error("❌ Error scraping Powerball page:", error.message);

    // Fallback JSON to keep the site functional
    const fallback = {
      drawDate: "Waiting for latest draw",
      numbers: ["-", "-", "-", "-", "-", "-"],
      powerPlay: "-",
      source: url,
      updated: new Date().toISOString(),
    };

    fs.writeFileSync("results.json", JSON.stringify(fallback, null, 2));
  }
}

scrapePowerball();
