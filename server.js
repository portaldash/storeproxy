import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get("/", (req, res) => {
  res.send("✅ Store Proxy is running.");
});

app.get("/clothing", async (req, res) => {
  const groupId = 7813984;
  const catalogUrl = `https://catalog.roblox.com/v1/search/items?category=Clothing&creatorTargetId=${groupId}&creatorType=Group&limit=30&sortOrder=Desc`;

  try {
    const response = await fetch(catalogUrl, {
      headers: {
        "User-Agent": "RobloxClothingProxy/1.0",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Roblox API error" });
    }

    const json = await response.json();

    const cleaned = (json.data || []).map(item => ({
      id: item.id,
      name: item.name,
      assetType: item.assetType?.id || null, // Should be 11 (Shirt), 12 (Pants)
    })).filter(item => item.assetType === 11 || item.assetType === 12);

    res.json({ data: cleaned });
  } catch (error) {
    console.error("Proxy failed to fetch clothing:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Store proxy listening on port ${PORT}`);
});
