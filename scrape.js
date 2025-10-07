import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

async function fetchPowerball() {
  const url = "https://www.powerball.com/";
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const drawDate = $(".winning-numbers__date").text().trim();
  const numbers = $(".winning-numbers__balls span")
    .map((_, el) => $(el).text().trim())
    .get();
  const powerPlay = $(".winning-numbers__powerplay span").text().trim() || "—";

  const result = {
    drawDate,
    numbers,
    powerPlay,
    source: "https://www.powerball.com/",
    updated: new Date().toISOString(),
  };

  fs.writeFileSync("results.json", JSON.stringify(result, null, 2));
  console.log("Updated Powerball results:", result);
}

fetchPowerball().catch(console.error);
