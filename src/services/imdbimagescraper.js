//this app is not being used for any monetary gain

import axios from "axios";
import cheerio from "cheerio";

async function scrapeImage(url) {
  const response = await axios.get(url);
  const html = response.data;
  const $ = cheerio.load(html);

  const imageUrl = $(".ipc-lockup-overlay__screen img").attr("src");
  return imageUrl;
}

export default scrapeImage;


