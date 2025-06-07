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
  let retries = 0;

  async function fetchWithRetry(url) {
    const MAX_RETRIES = 5;
    let delay = 1000;

    while (retries < MAX_RETRIES) {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "StoreProxy/2.1",
            "Accept": "application/json",
          },
        });

        const text = await response.text();
        if (response.status === 429) {
          console.warn(`⏳ 429 Too Many Requests — Retrying in ${delay}ms`);
          await sleep(delay);
          delay *= 2;
          retries++;
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
        }

        const json = JSON.parse(text);
        if (!json || !Array.isArray(json.data)) {
          throw new Error("Malformed or missing 'data' array");
        }

        return json;
      } catch (err) {
        console.error(`⚠️ Fetch error: ${err.message}`);
        await sleep(delay);
        delay *= 2;
        retries++;
      }
    }

    throw new Error("Max retries exceeded");
  }

  try {
    while (true) {
      const url = `${baseUrl}${cursor ? `&Cursor=${cursor}` : ""}`;
      console.log(`🔁 Page ${page}${cursor ? ` (cursor: ${cursor})` : ""}`);

      const json = await fetchWithRetry(url);

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
      await sleep(500); // base delay between pages
    }

    logRequest(req.ip, allItems.length);
    res.json({ data: allItems });
  } catch (err) {
    console.error("💥 Failed to fetch all pages:", err.stack || err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ StoreProxy running at http://localhost:${PORT}`);
});
