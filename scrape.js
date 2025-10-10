import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

const SOURCES = [
  { url: "https://www.lotteryusa.com/powerball/", name: "LotteryUSA" },
  { url: "https://www.powerball.com/", name: "Powerball Official" }
];

function parseLotteryUSA(html) {
  const $ = cheerio.load(html);

  // Try a few likely selectors:
  const liNums = $("ul.draw-result li").map((i, el) => $(el).text().trim()).get();
  if (liNums.length >= 6) {
    // sometimes the “PB” is appended, so filter
    const cleaned = liNums.map(n => n.replace(/PB.*$/i, "").trim());
    return {
      drawDate: $("h1").first().text().trim(),
      numbers: cleaned.slice(0,6), // take first 6
      powerPlay: (html.match(/Power Play[:\s]*([0-9]x)/i) || ["", "-"])[1],
      source: "LotteryUSA",
      updated: new Date().toISOString()
    };
  }

  const spanNums = $("span.result").map((i, el) => $(el).text().trim()).get();
  if (spanNums.length >= 6) {
    return {
      drawDate: $("h1").first().text().trim(),
      numbers: spanNums.slice(0,6),
      powerPlay: (html.match(/Power Play[:\s]*([0-9]x)/i) || ["", "-"])[1],
      source: "LotteryUSA",
      updated: new Date().toISOString()
    };
  }

  return null;
}

function parseOfficial(html) {
  const $ = cheerio.load(html);
  const nums = [];
  $(".winning-numbers__balls span").each((i, el) => {
    nums.push($(el).text().trim());
  });
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
  let text;
  try {
    const res = await fetch(src.url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    console.log("Status:", res.status);
    text = await res.text();
    console.log("Fetched length:", text.length);
    console.log("Snippet:", text.slice(0, 800).replace(/\s+/g, " ").slice(0, 800) + (text.length > 800 ? " …" : ""));
  } catch (err) {
    console.error("Fetch error:", err.message);
    return null;
  }

  if (src.name === "LotteryUSA") {
    const r = parseLotteryUSA(text);
    if (r) return r;
  }
  // fallback to official
  const r2 = parseOfficial(text);
  if (r2) return r2;

  return null;
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
