import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

const SOURCES = [
  { url: "https://www.lotteryusa.com/powerball/", type: "html", name: "LotteryUSA Powerball" },
  { url: "https://www.powerball.com/", type: "html", name: "Powerball Home" }
  // other sources can go here
];

function parseLotteryUSA(html) {
  const $ = cheerio.load(html);
  // On LotteryUSA, the numbers appear as <span class="result">N</span>
  const spans = $("span.result");
  if (spans.length < 6) {
    return null;
  }
  const nums = spans.slice(0, 6).map((i, el) => $(el).text().trim()).get();
  // often the first five are white balls, last is Powerball
  // date: there's an element showing “Powerball Wednesday Oct 08, 2025” etc
  const dateHeader = $("h1").first().text().trim();
  const dateMatch = dateHeader.match(/\w+\s+\d{1,2},\s*\d{4}/);
  const drawDate = dateMatch ? dateMatch[0] : "";
  // power play: find text “Power Play: X” or similar
  let powerPlay = "";
  const ppMatch = html.match(/Power Play[:\s]*([0-9]+[xX])/i);
  if (ppMatch) powerPlay = ppMatch[1];
  return {
    drawDate,
    numbers: nums,
    powerPlay: powerPlay || "-",
    source: "LotteryUSA",
    updated: new Date().toISOString()
  };
}

function parseFallback(html) {
  const $ = cheerio.load(html);
  // try extracting from Powerball.com if possible
  const nums = [];
  $(".winning-number").each((i, el) => {
    nums.push($(el).text().trim());
  });
  if (nums.length >= 6) {
    const drawDate = $(".date").first().text().trim() || "";
    const powerPlay = $(".multiplier").first().text().trim() || "-";
    return {
      drawDate,
      numbers: nums.slice(0, 6),
      powerPlay,
      source: "PowerballOfficial",
      updated: new Date().toISOString()
    };
  }
  return null;
}

async function trySource(src) {
  try {
    console.log(`\n--- Fetching ${src.name}: ${src.url}`);
    const res = await fetch(src.url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0)" }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Fetched length:", text.length);
    console.log("Snippet:", text.slice(0, 500).replace(/\s+/g, " ").slice(0, 500) + (text.length > 500 ? "…" : ""));

    if (src.name === "LotteryUSA Powerball") {
      const ret = parseLotteryUSA(text);
      if (ret) return ret;
    }
    // fallback to official parse
    const ret2 = parseFallback(text);
    if (ret2) return ret2;

    return null;
  } catch (err) {
    console.error(`Error fetching ${src.url}:`, err.message);
    return null;
  }
}

(async () => {
  let result = null;
  for (const src of SOURCES) {
    const r = await trySource(src);
    if (r) {
      result = r;
      break;
    }
  }
  if (!result) {
    // fallback
    result = {
      drawDate: "Waiting for latest draw",
      numbers: ["-", "-", "-", "-", "-", "-"],
      powerPlay: "-",
      source: "none",
      updated: new Date().toISOString()
    };
  }
  fs.writeFileSync("results.json", JSON.stringify(result, null, 2));
  console.log("Wrote results.json:", result);
})();
