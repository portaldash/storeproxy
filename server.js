import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// === Group Settings ===
const DEFAULT_GROUP_ID = 7813984;
const DEFAULT_CATEGORY = 3; // 3 = Clothing
const DEFAULT_LIMIT = 30;

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
  const cursor = req.query.cursor || "";
  const limit = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, 30); // Roblox hard limit is 30

  const url = `https://catalog.roblox.com/v1/search/items/details?Category=${category}&CreatorType=2&IncludeNotForSale=true&Limit=${limit}&CreatorTargetId=${groupId}${cursor ? `&Cursor=${cursor}` : ""}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "StoreProxy/2.2",
        "Accept": "application/json",
      },
    });

    const text = await response.text();
    const json = JSON.parse(text);

    if (!Array.isArray(json.data)) {
      return res.status(response.status).json({
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

    logRequest(req, filtered.length);

    res.json({
      data: filtered,
      nextPageCursor: json.nextPageCursor || null,
    });
  } catch (err) {
    console.error(`[ERROR] Failed to fetch page: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch page", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ StoreProxy running at http://localhost:${PORT}`);
});
