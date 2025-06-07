import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// === Group Settings ===
const GROUP_ID = 7813984;
const CATEGORY = 3; // Clothing
const MAX_LIMIT = 30; // Allowed: 10, 28, or 30
const DELAY_BETWEEN_REQUESTS = 500; // ms

function logRequest(ip, resultCount = 0) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${ip} → /clothing (${resultCount} items)`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.get("/", (req, res) => {
  res.send("✅ StoreProxy is running. Use /clothing to fetch group assets.");
});

app.get("/clothing", async (req, res) => {
  const baseUrl = `https://catalog.roblox.com/v1/search/items/details?Category=${CATEGORY}&CreatorType=2&IncludeNotForSale=true&Limit=${MAX_LIMIT}&CreatorTargetId=${GROUP_ID}`;

  const allItems = [];
  let cursor = "";
  let page = 1;

  try {
    while (true) {
      const url = `${baseUrl}${cursor ? `&Cursor=${cursor}` : ""}`;

      console.log(`🔁 Page ${page}${cursor ? ` (cursor: ${cursor})` : ""}`);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "StoreProxy/2.1",
          "Accept": "application/json",
        },
      });

      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        console.error("❌ Failed to parse JSON:\n", text.slice(0, 300));
        return res.status(500).json({ error: "Invalid JSON from Roblox", bodyPreview: text.slice(0, 300) });
      }

      if (!json || !Array.isArray(json.data)) {
        console.error("⚠️ Malformed data:\n", text.slice(0, 300));
        return res.status(500).json({
          error: "Missing or malformed 'data' array in Roblox response",
          robloxStatus: response.status,
          robloxBodyPreview: text.slice(0, 300),
        });
      }

      const filtered = json.data
        .filter(item => item.assetType === 11 || item.assetType === 12)
        .map(item => ({
          id: item.id,
          name: item.name,
          assetType: item.assetType,
          price: item.price || 0,
          creatorName: item.creatorName || "Unknown",
        }));

      allItems.push(...filtered);

      if (!json.nextPageCursor) break;

      cursor = json.nextPageCursor;
      page++;
      await sleep(DELAY_BETWEEN_REQUESTS);
    }

    logRequest(req.ip, allItems.length);
    res.json({ data: allItems });
  } catch (err) {
    console.error("💥 Unexpected error:\n", err.stack || err.message);
    res.status(500).json({ error: "Fetch failed unexpectedly" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ StoreProxy running at http://localhost:${PORT}`);
});
