import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

const SOURCES = [
  { url: "https://www.lotterycritic.com/powerball/results/", name: "LotteryCritic" },
  { url: "https://www.powerball.com/", name: "Powerball Official" }
];

function parseLotteryCritic(html) {
  const $ = cheerio.load(html);

  const firstDraw = $(".results-item").first();
  const date = firstDraw.find(".results-date").text().trim();

  const nums = firstDraw.find(".results-ball").map((i, el) => $(el).text().trim()).get();
  const powerPlay = firstDraw.find(".powerplay").text().trim() || "-";

  if (nums.length >= 6) {
    return {
      drawDate: date || "Unknown",
      numbers: nums.slice(0, 6),
      powerPlay: powerPlay,
      source: "LotteryCritic",
      updated: new Date().toISOString()
    };
  }
  return null;
}

function parseOfficial(html) {
  const $ = cheerio.load(html);
  const nums = [];
  $(".winning-numbers__balls span").each((i, el) => nums.push($(el).text().trim()));
  if (nums.length >= 6) {
    return {
      drawDate: $(".winning-numbers__date").text().trim(),
      numbers: nums,
      powerPlay: $(".powerplay span").text().trim() || "-",
      source: "Powerball Official",
      updated: new Date().toISOString()
    };
  }
  return null;
}

async function trySource(src) {
  console.log(`\n--- Fetching ${src.name}: ${src.url}`);
  try {
    const res = await fetch(src.url, { headers: { "User-Agent": "Mozilla/5.0" } });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Fetched length:", text.length);
    console.log("Snippet:", text.slice(0, 500).replace(/\s+/g, " ").slice(0, 500) + (text.length > 500 ? " ..." : ""));

    if (src.name === "LotteryCritic") {
      const r = parseLotteryCritic(text);
      if (r) return r;
    }
    if (src.name === "Powerball Official") {
      const r2 = parseOfficial(text);
      if (r2) return r2;
    }
  } catch (err) {
    console.error("❌ Fetch error:", err.message);
  }
  return null;
}

(async () => {
  let result = null;
  for (const src of SOURCES) {
    result = await trySource(src);
    if (result) break;
  }

  if (!result) {
    result = {
      drawDate: "Waiting for latest draw",
      numbers: ["-", "-", "-", "-", "-", "-"],
      powerPlay: "-",
      source: "none",
      updated: new Date().toISOString()
    };
  }

  fs.writeFileSync("results.json", JSON.stringify(result, null, 2));
  console.log("✅ Wrote results.json:", result);
})();
