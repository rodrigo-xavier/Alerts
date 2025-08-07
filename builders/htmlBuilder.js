const fs = require("fs");
const path = require("path");

function generateIndexHTML(RSS_DIR, outputFile = "index.html") {
  const files = fs.readdirSync(RSS_DIR).filter(f => f.endsWith(".xml"));
  const links = files.map(file => `<li><a href="${RSS_DIR}/${file}" target="_blank">${file}</a></li>`).join("\n");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Feeds RSS</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 40px auto;
      background: #f9f9f9;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    h1 {
      text-align: center;
      color: #333;
    }
    ul {
      list-style: none;
      padding-left: 0;
    }
    li {
      margin: 10px 0;
    }
    a {
      text-decoration: none;
      color: #007BFF;
      font-weight: bold;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <h1>Feeds RSS Disponíveis</h1>
  <ul>
    ${links}
  </ul>
</body>
</html>`;

  fs.writeFileSync(outputFile, html);
  console.log(`${outputFile} gerado com sucesso.`);
}

module.exports = generateIndexHTML;
