// scrape.js (ESM)
import fs from "fs";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const SOURCES = [
  { url: "https://www.powerball.com/api/v1/numbers/powerball/recent?_format=json", type: "json_api" },
  { url: "https://www.powerball.com/games/powerball", type: "html" },
  { url: "https://www.powerball.com/", type: "html" },
  { url: "https://www.lotteryusa.com/powerball/", type: "html" }
];

function extractNumbersFromText(text) {
  // 1) Look for an explicit "Winning Numbers" vicinity
  const winIdx = text.search(/winning numbers/i);
  if (winIdx !== -1) {
    const snippet = text.slice(winIdx, winIdx + 1000);
    const nums = [...snippet.matchAll(/\b(\d{1,2})\b/g)].map(m => m[1]);
    if (nums.length >= 6) return nums.slice(0, 6);
  }

  // 2) Look for any run of 6 numbers separated by non-digits
  const run6 = text.match(/(?:\b\d{1,2}\b\D{0,5}){5}\b\d{1,2}\b/);
  if (run6) {
    const nums = [...run6[0].matchAll(/\b(\d{1,2})\b/g)].map(m => m[1]);
    if (nums.length >= 6) return nums.slice(0, 6);
  }

  // 3) Look for JSON-like "field_winning_numbers":"12 34 56 67 68 21"
  const jsonMatch = text.match(/"(?:field_winning_numbers|winning_numbers|winningNumbers)"\s*:\s*"([^"]+)"/i);
  if (jsonMatch) {
    const parts = jsonMatch[1].trim().split(/\D+/).filter(Boolean);
    if (parts.length >= 6) return parts.slice(0, 6);
  }

  // 4) Fallback: find all 1-2 digit numbers and attempt heuristic:
  const allNums = [...text.matchAll(/\b(\d{1,2})\b/g)].map(m => parseInt(m[1], 10));
  // keep only plausible ranges: white balls 1-69, powerball 1-26
  const plausible = allNums.filter(n => n >= 1 && n <= 69);
  if (plausible.length >= 6) return plausible.slice(0, 6).map(String);

  return null;
}

function makeFallback() {
  return {
    drawDate: "Waiting for latest draw",
    numbers: ["-", "-", "-", "-", "-", "-"],
    powerPlay: "-",
    source: "none",
    updated: new Date().toISOString()
  };
}

async function trySource(source) {
  try {
    console.log(`\n--- fetching ${source.url}`);
    const res = await fetch(source.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "text/html,application/json;q=0.9,*/*;q=0.8"
      },
      redirect: "follow",
      timeout: 20000
    });

    console.log("status:", res.status);
    const contentType = res.headers.get("content-type") || "";
    console.log("content-type:", contentType);

    const text = await res.text();
    console.log("fetched length:", text.length);

    // Write a short debug snippet to the logs (first 1200 chars)
    console.log("snippet:", text.slice(0, 1200).replace(/\s+/g, " ").slice(0, 500) + (text.length > 500 ? "..." : ""));

    // If JSON API:
    if (contentType.includes("application/json") || source.type === "json_api") {
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data) && data.length > 0) {
          const first = data[0];
          const winning =
            first.field_winning_numbers ||
            first.winning_numbers ||
            first.winningNumbers ||
            first.field_winning_numbers_text ||
            "";
          const numbers = winning.toString().trim().split(/\D+/).filter(Boolean);
          const drawDate = first.field_draw_date || first.draw_date || first.draw || first.date || "";
          const powerPlay = first.field_multiplier || first.multiplier || "";
          if (numbers.length >= 6) {
            return {
              drawDate: drawDate || new Date().toISOString(),
              numbers: numbers.slice(0, 6),
              powerPlay: powerPlay || "-",
              source: source.url,
              updated: new Date().toISOString()
            };
          }
        } else if (typeof data === "object" && data !== null) {
          // handle single object responses
          const winning = data.field_winning_numbers || data.winning_numbers || "";
          const numbers = winning.toString().trim().split(/\D+/).filter(Boolean);
          if (numbers.length >= 6) {
            return {
              drawDate: data.field_draw_date || data.draw_date || new Date().toISOString(),
              numbers: numbers.slice(0, 6),
              powerPlay: data.field_multiplier || "-",
              source: source.url,
              updated: new Date().toISOString()
            };
          }
        }
      } catch (e) {
        console.error("JSON parse error for", source.url, e.message);
      }
    }

    // If HTML, try cheerio selectors first
    if (contentType.includes("text/html") || source.type === "html") {
      const $ = cheerio.load(text);

      // Common selectors (try many)
      const selectors = [
        ".winning-number",       // sometimes used
        ".white-ball",           // commonly used
        ".winning-numbers__balls span", // OPAP-like
        "ul.winning-numbers li",
        ".result .result__ball", // lotteryusa like structures
        ".draw-result .ball",
        ".balls .ball",
        ".result .ball",
        ".winning-numbers span",
        "span.result"           // lotteryusa uses <span class="result">#
      ];
      for (const sel of selectors) {
        const arr = [];
        $(sel).each((i, el) => {
          const v = $(el).text().trim();
          if (v) arr.push(v);
        });
        if (arr.length >= 6) {
          // try to normalize to exactly 6 (last is usually powerball)
          return {
            drawDate: ( $("time").first().attr("datetime") || $("time").first().text() || $("span.draw-date").first().text() || new Date().toISOString() ).trim(),
            numbers: arr.slice(0, 6),
            powerPlay: ($(".powerplay").first().text().trim() || $(".multiplier").first().text().trim() || "-"),
            source: source.url,
            updated: new Date().toISOString()
          };
        }
      }

      // If selectors fail, run text-based extraction:
      const extracted = extractNumbersFromText(text);
      if (extracted && extracted.length >= 6) {
        return {
          drawDate: (text.match(/(?:draw date|drawing date|date[:\s]*)[:\s]*([A-Za-z0-9,\s-]+)/i) || [])[1] || new Date().toISOString(),
          numbers: extracted.slice(0, 6),
          powerPlay: (text.match(/Power Play[:\s]*([0-9]x)/i) || [])[1] || "-",
          source: source.url,
          updated: new Date().toISOString()
        };
      }
    }

    return null;
  } catch (err) {
    console.error("fetch error for", source.url, err.message || err);
    return null;
  }
}

(async () => {
  let final = null;
  let lastDebug = { tried: [] };

  for (const src of SOURCES) {
    const res = await trySource(src);
    lastDebug.tried.push({ url: src.url, succeeded: !!res });
    if (res) {
      final = res;
      break;
    }
  }

  if (!final) {
    // nothing worked: write fallback + debug file
    const fallback = makeFallback();
    fs.writeFileSync("results.json", JSON.stringify(fallback, null, 2));
    fs.writeFileSync("debug.txt", `No result found. Tried sources:\n${JSON.stringify(lastDebug, null, 2)}\n\nCheck the logs above for snippets from each fetch.`);
    console.log("Wrote fallback results.json and debug.txt. Inspect Actions logs and debug.txt.");
  } else {
    fs.writeFileSync("results.json", JSON.stringify(final, null, 2));
    console.log("WROTE results.json:", final);
  }
})();
