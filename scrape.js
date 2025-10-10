import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

const SOURCES = [
  { url: "https://www.lottonumbers.com/powerball-results.asp", name: "LottoNumbers" },
  { url: "https://www.powerball.com/", name: "Powerball Official" }
];

function parseLottoNumbers(html) {
  const $ = cheerio.load(html);

  // The latest draw is usually in a <ul class="balls"> within a container.
  const latest = $(".balls").first();
  const nums = latest.find("li").map((i, el) => $(el).text().trim()).get();
  const drawDate = $(".results").first().find("h2, h1").first().text().trim();
  const powerPlay = $("td:contains('Power Play')").next().text().trim() || "-";

  if (nums.length >= 6) {
    return {
      drawDate: drawDate || "Unknown",
      numbers: nums.slice(0, 6),
      powerPlay: powerPlay || "-",
      source: "LottoNumbers",
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
    console.log(
      "Snippet:",
      text.slice(0, 300).replace(/\s+/g, " ").slice(0, 300) +
        (text.length > 300 ? " ..." : "")
    );

    if (src.name === "LottoNumbers") {
      const r = parseLottoNumbers(text);
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
