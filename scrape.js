import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

const DRAW_URL = "https://www.powerball.com/draw-result";

async function scrapePowerballDraw() {
  try {
    console.log("Fetching draw result page:", DRAW_URL);
    const res = await fetch(DRAW_URL, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    console.log("Status:", res.status);
    const html = await res.text();
    console.log("Fetched length:", html.length);
    console.log("Snippet:", html.slice(0, 500).replace(/\s+/g, " ").slice(0, 500) + (html.length > 500 ? " ..." : ""));

    const $ = cheerio.load(html);

    // Extract draw date
    const dateText = $("h1 + p, .draw-result h1, .draw-result .date").first().text().trim();
    // The above selector tries near the heading or in known date containers.

    // Winning numbers are in a list under “Winning Numbers” header
    const nums = [];
    $(".winning-numbers li, .winning-numbers__balls span").each((i, el) => {
      const txt = $(el).text().trim();
      if (txt) {
        nums.push(txt);
      }
    });

    // Or fallback: each number appears in <td> or <div> under “Winning Numbers” section
    if (nums.length < 6) {
      $("table.draw-result td, .draw-result .balls span").each((i, el) => {
        const txt = $(el).text().trim();
        if (txt.match(/^\d+$/)) {
          nums.push(txt);
        }
      });
    }

    const powerPlay = $(".powerplay, .powerplay span").first().text().trim() || "-";

    if (nums.length >= 6) {
      const result = {
        drawDate: dateText || "Unknown Draw Date",
        numbers: nums.slice(0, 6),
        powerPlay,
        source: DRAW_URL,
        updated: new Date().toISOString()
      };
      fs.writeFileSync("results.json", JSON.stringify(result, null, 2));
      console.log("✅ Wrote results.json:", result);
    } else {
      throw new Error("Not enough numbers found");
    }
  } catch (err) {
    console.error("❌ Error scraping draw-result page:", err.message);
    // fallback
    const fallback = {
      drawDate: "Waiting for latest draw",
      numbers: ["-", "-", "-", "-", "-", "-"],
      powerPlay: "-",
      source: DRAW_URL,
      updated: new Date().toISOString()
    };
    fs.writeFileSync("results.json", JSON.stringify(fallback, null, 2));
  }
}

scrapePowerballDraw();
