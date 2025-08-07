const generateIndexHTML = require("./htmlBuilder");
const Parser = require("rss-parser");
const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");

const FEEDS_DIR = "feeds";
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
  const xmlPath = path.join(RSS_DIR, `${feedName}.xml`);
  const urls = fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .map(url => url.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    console.warn(`⚠ Arquivo vazio ou sem URLs válidas: ${filename}`);
    return;
  }

  let allItems = [];

  // 1. Carregar novos itens das URLs
  for (const url of urls) {
    try {
      const feed = await rssParser.parseURL(url);
      allItems.push(...feed.items);
    } catch (err) {
      console.error(`Erro ao carregar: ${url}`, err.message);
    }
  }

  // 2. Carregar itens já existentes no XML salvo
  if (fs.existsSync(xmlPath)) {
    const existingXML = fs.readFileSync(xmlPath, "utf-8");
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(existingXML);

    const existingItems = parsed?.rss?.channel?.item || [];
    const normalizedItems = Array.isArray(existingItems) ? existingItems : [existingItems];

    allItems.push(...normalizedItems.map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      contentSnippet: item.description
    })));
  }

  // 3. Remover duplicatas
  const seenLinks = new Set();
  const uniqueItems = allItems.filter(item => {
    if (!seenLinks.has(item.link)) {
      seenLinks.add(item.link);
      return true;
    }
    return false;
  });

  // 4. Filtrar apenas os últimos 15 dias
  const now = Date.now();
  const recentItems = uniqueItems.filter(item => {
    const date = new Date(item.pubDate || item.isoDate);
    return now - date.getTime() <= MAX_AGE_DAYS * DAY_MS;
  });

  if (recentItems.length === 0) {
    console.warn(`⚠ Nenhum item recente em ${filename}. Nenhum arquivo será gerado.`);
    return;
  }

  // 5. Ordenar por data
  recentItems.sort((a, b) => new Date(b.pubDate || b.isoDate) - new Date(a.pubDate || a.isoDate));

  // 6. Gerar XML
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

  fs.writeFileSync(xmlPath, rss);
  console.log(`✅ Atualizado: ${filename}`);
}

async function main() {
  const feedFiles = fs.readdirSync(FEEDS_DIR).filter(file => file.endsWith(".txt"));

  for (const file of feedFiles) {
    await processFeedFile(file);
  }

  generateIndexHTML(RSS_DIR, "index.html");
}

main();