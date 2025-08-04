const Parser = require("rss-parser");
const fs = require("fs");
const parser = new Parser();
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_AGE_DAYS = 15;

async function main() {
  const urls = fs.readFileSync("feeds.txt", "utf-8").split("\n").filter(Boolean);
  let allItems = [];

  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url);
      allItems.push(...feed.items);
    } catch (err) {
      console.error("Erro ao carregar:", url, err.message);
    }
  }

  // Remover duplicatas por link
  const uniqueItems = [];
  const seenLinks = new Set();
  for (const item of allItems) {
    if (!seenLinks.has(item.link)) {
      seenLinks.add(item.link);
      uniqueItems.push(item);
    }
  }

  // Filtrar por data (últimos 15 dias)
  const now = Date.now();
  const recentItems = uniqueItems.filter(item => {
    const pubDate = new Date(item.pubDate || item.isoDate || 0).getTime();
    return now - pubDate < MAX_AGE_DAYS * DAY_MS;
  });

  // Salvar como JSON (histórico)
  fs.writeFileSync("feeds.json", JSON.stringify(recentItems, null, 2));

  // Gerar RSS XML
  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>Feed Mesclado</title>
  <link>https://rodrigo-xavier.github.io/</link>
  <description>Feed RSS unificado de vários Google Alerts</description>
  ${recentItems.map(item => `
  <item>
    <title><![CDATA[${item.title}]]></title>
    <link>${item.link}</link>
    <pubDate>${new Date(item.pubDate || item.isoDate).toUTCString()}</pubDate>
    <description><![CDATA[${item.contentSnippet || ""}]]></description>
  </item>`).join("")}
</channel>
</rss>`;

  fs.writeFileSync("index.xml", rss);
}

main();
