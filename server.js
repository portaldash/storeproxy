import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const DEFAULT_GROUP_ID = 7813984;
const DEFAULT_CATEGORY = 3; // Clothing
const DEFAULT_LIMIT = 120; // Max allowed by Roblox

function logRequest(req, resultCount = 0) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.ip} → ${req.originalUrl} (${resultCount} items)`);
}

app.get("/", (req, res) => {
  res.send("✅ StoreProxy is running. Use /clothing to fetch group assets.");
});

app.get("/clothing", async (req, res) => {
  const category = parseInt(req.query.category) || DEFAULT_CATEGORY;
  const groupId = parseInt(req.query.groupId) || DEFAULT_GROUP_ID;
  const limit = parseInt(req.query.limit) || DEFAULT_LIMIT;
  const cursor = req.query.cursor || "";
  const debug = req.query.debug === "true";
  const fetchAll = req.query.full === "true";

  const baseUrl = `https://catalog.roblox.com/v1/search/items/details?Category=${category}&CreatorType=2&IncludeNotForSale=true&Limit=${limit}&CreatorTargetId=${groupId}`;

  const allItems = [];
  let currentCursor = cursor;
  let page = 1;

  try {
    while (true) {
      const url = `${baseUrl}${currentCursor ? `&Cursor=${currentCursor}` : ""}`;

      console.log(`🔎 Fetching page ${page}${currentCursor ? ` (cursor: ${currentCursor})` : ""}`);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "StoreProxy/2.0",
          "Accept": "application/json",
        },
      });

      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        console.error("❌ Failed to parse JSON from Roblox:\n", text.slice(0, 300));
        return res.status(500).json({ error: "Invalid JSON from Roblox", bodyPreview: text.slice(0, 300) });
      }

      if (!json || typeof json !== "object" || !Array.isArray(json.data)) {
        console.error("⚠️ Unexpected structure:", JSON.stringify(json, null, 2));
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

      if (!fetchAll || !json.nextPageCursor) {
        logRequest(req, allItems.length);
        return res.json({
          data: allItems,
          nextPageCursor: json.nextPageCursor || null,
          previousPageCursor: json.previousPageCursor || null,
          raw: debug ? json : undefined,
        });
      }

      currentCursor = json.nextPageCursor;
      page++;
    }
  } catch (err) {
    console.error(`[ERROR] Exception during fetch:\n`, err.stack || err.message);
    res.status(500).json({ error: "Fetch failed unexpectedly" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ StoreProxy running at http://localhost:${PORT}`);
});
