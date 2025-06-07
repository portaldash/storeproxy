import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const GROUP_ID = 7813984;
let cachedData = null;
let lastFetched = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

async function fetchClothing() {
  const url = `https://catalog.roproxy.com/v2/search/items/details?Category=3&CreatorType=2&CreatorTargetId=${GROUP_ID}&Limit=100`;

  const res = await fetch(url);
  const json = await res.json();

  const results = (json.data || []).filter(i => i.assetType === 11 || i.assetType === 12);
  return results;
}

app.get("/clothing", async (req, res) => {
  if (Date.now() - lastFetched > CACHE_DURATION || !cachedData) {
    try {
      cachedData = await fetchClothing();
      lastFetched = Date.now();
    } catch (e) {
      console.error("Failed to fetch:", e);
      return res.status(500).json({ error: "Fetch failed" });
    }
  }

  res.json({ data: cachedData });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Clothing proxy running on port ${PORT}`));
