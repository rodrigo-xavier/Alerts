const generateIndexHTML = require("./generateIndexHTML");
const Parser = require("rss-parser");
const fs = require("fs");
const path = require("path");
const parser = new Parser();

const FEEDS_DIR = "feeds";
const BACKUP_DIR = "backup";
const RSS_DIR = "RSS";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_AGE_DAYS = 15;

function escapeXML(str = "") {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function processFeedFile(filename) {
  const feedName = path.basename(filename, ".txt");
  const filePath = path.join(FEEDS_DIR, filename);

  const urls = fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .map(url => url.trim())
    .filter(Boolean);

  let allItems = [];

  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url);
      allItems.push(...feed.items);
    } catch (err) {
      console.error(`Erro ao carregar: ${url}`, err.message);
    }
  }

  // Remover duplicatas
  const seenLinks = new Set();
  const uniqueItems = allItems.filter(item => {
    if (!seenLinks.has(item.link)) {
      seenLinks.add(item.link);
      return true;
    }
    return false;
  });

  // Filtrar últimos 15 dias
  const now = Date.now();
  const recentItems = uniqueItems.filter(item => {
    const pubDate = new Date(item.pubDate || item.isoDate || 0).getTime();
    return now - pubDate < MAX_AGE_DAYS * DAY_MS;
  });

  // Salvar JSON
  const jsonPath = path.join(BACKUP_DIR, `${feedName}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(recentItems, null, 2));

  // Gerar XML
  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>Feed Mesclado - ${feedName}</title>
  <link>https://rodrigo-xavier.github.io/</link>
  <description>Feed RSS unificado de vários Google Alerts</description>
  ${recentItems.map(item => `
  <item>
    <title><![CDATA[${escapeXML(item.title) || ""}]]></title>
    <link>${escapeXML(item.link)}</link>
    <pubDate>${new Date(item.pubDate || item.isoDate).toUTCString()}</pubDate>
    <description><![CDATA[${escapeXML(item.contentSnippet) || ""}]]></description>
  </item>`).join("")}
</channel>
</rss>`;

  const xmlPath = path.join(RSS_DIR, `${feedName}.xml`);
  fs.writeFileSync(xmlPath, rss);

  console.log(`Processado: ${filename}`);
}

async function main() {
  const feedFiles = fs.readdirSync(FEEDS_DIR).filter(file => file.endsWith(".txt"));

  for (const file of feedFiles) {
    await processFeedFile(file);
  }

  generateIndexHTML(RSS_DIR, "index.html");
}

main();