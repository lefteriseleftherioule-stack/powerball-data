import fetch from "node-fetch";
import fs from "fs";

const API_URL = "https://www.powerball.com/api/v1/numbers/powerball/recent10";

async function scrapePowerballAPI() {
  try {
    console.log("Fetching official Powerball API:", API_URL);
    const res = await fetch(API_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
    console.log("Status:", res.status);
    const data = await res.json();

    const latest = data[0];
    if (!latest || !latest.field_winning_numbers) throw new Error("No valid draw data found");

    const drawDate = latest.field_draw_date;
    const numbers = latest.field_winning_numbers.split(" ");
    const powerPlay = latest.field_multiplier || "-";

    const result = {
      drawDate,
      numbers,
      powerPlay,
      source: API_URL,
      updated: new Date().toISOString()
    };

    fs.writeFileSync("results.json", JSON.stringify(result, null, 2));
    console.log("✅ Wrote results.json:", result);
  } catch (err) {
    console.error("❌ Error scraping Powerball API:", err.message);
    const fallback = {
      drawDate: "Waiting for latest draw",
      numbers: ["-", "-", "-", "-", "-", "-"],
      powerPlay: "-",
      source: API_URL,
      updated: new Date().toISOString()
    };
    fs.writeFileSync("results.json", JSON.stringify(fallback, null, 2));
  }
}

scrapePowerballAPI();
