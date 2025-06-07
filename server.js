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
  const url = `https://catalog.roblox.com/v1/search/items/details?Category=3&CreatorType=2&IncludeNotForSale=true&Limit=30&CreatorTargetId=${groupId}`;

  try {
    const response = await fetch(url, {
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
      assetType: item.assetType?.id || null, // 11 = Shirt, 12 = Pants
    })).filter(item => item.assetType === 11 || item.assetType === 12);

    res.json({ data: cleaned });
  } catch (error) {
    console.error("Failed to fetch group clothing:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Store proxy listening on port ${PORT}`);
});
