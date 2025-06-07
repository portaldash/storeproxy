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
  const limit = parseInt(req.query.limit) || DEFAULT_LIMIT;
  const debug = req.query.debug === "true";

  const url = `https://catalog.roblox.com/v1/search/items/details?Category=${category}&CreatorType=2&IncludeNotForSale=true&Limit=${limit}&CreatorTargetId=${groupId}${cursor ? `&Cursor=${cursor}` : ""}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "RobloxProxy/1.1",
        "Accept": "application/json",
      },
    });

    const json = await response.json();

    if (!json || typeof json !== "object") {
      return res.status(500).json({ error: "Invalid JSON from Roblox" });
    }

    if (!Array.isArray(json.data)) {
      return res.status(500).json({ error: "Missing data array from Roblox response" });
    }

    const filtered = json.data
      .filter(item => item.assetType?.id === 11 || item.assetType?.id === 12)
      .map(item => ({
        id: item.id,
        name: item.name,
        assetType: item.assetType.id,
        price: item.price || 0,
        creatorName: item.creator?.name || "Unknown",
      }));

    logRequest(req, filtered.length);

    res.json({
      data: filtered,
      nextPageCursor: json.nextPageCursor || null,
      previousPageCursor: json.previousPageCursor || null,
      raw: debug ? json : undefined,
    });
  } catch (err) {
    console.error(`[ERROR] Failed to fetch from Roblox API:\n`, err.stack || err.message);
    res.status(500).json({
      error: "Failed to fetch group assets",
      suggestion: "Make sure the group has published clothing. Try adding '?debug=true' to see full response.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ StoreProxy running at http://localhost:${PORT}`);
});
