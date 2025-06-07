import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get("/", (req, res) => {
  res.send("✅ Store proxy is running.");
});

app.get("/clothing", async (req, res) => {
  const url = "https://catalog.roblox.com/v1/search/items/details?Category=3&CreatorType=2&IncludeNotForSale=true&Limit=30&CreatorTargetId=7813984";

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "RobloxProxy/1.0",
        "Accept": "application/json",
      },
    });

    const json = await response.json();

    if (!json.data || !Array.isArray(json.data)) {
      return res.status(500).json({ error: "Unexpected API response format" });
    }

    const filtered = json.data
      .filter(item => item.assetType?.id === 11 || item.assetType?.id === 12)
      .map(item => ({
        id: item.id,
        name: item.name,
        assetType: item.assetType.id,
      }));

    res.json({ data: filtered });
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch clothing assets" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Store proxy running at http://localhost:${PORT}`);
});
