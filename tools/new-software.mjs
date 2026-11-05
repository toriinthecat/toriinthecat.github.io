// Adds a program to the site: `node tools/new-software.mjs <id> "<Name>"`.
// Writes src/pages/<id>/index.html and src/pages/en/<id>/index.html from a template (placeholders
// marked `ph`), and puts the program at the top of src/software.json with status "coming".
// Then: fill in the pages, add its part to the privacy policy and, if it is sold, to the legal
// notice (see README.md, "Adding a program").
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [id, name] = process.argv.slice(2);
if (!id || !name || !/^[a-z0-9-]+$/.test(id)) {
  console.error('usage: node tools/new-software.mjs <id: lowercase, digits, hyphens> "<Name>"');
  process.exit(2);
}

const listPath = join(root, "src", "software.json");
const list = JSON.parse(readFileSync(listPath, "utf8"));
if (list.software.some((s) => s.id === id)) {
  console.error(`${id} is already in src/software.json`);
  process.exit(1);
}

const pages = {
  ja: `<!-- {"title": "${name}", "description": "${name} の紹介。", "nav": "software", "section": "${id}", "page": "index"} -->
<h1>${name}</h1>
<p class="lead"><span class="ph">一行の紹介</span></p>

<h2>概要</h2>
<p class="ph-block">紹介文、対応 OS、入手先、スクリーンショット。</p>

<h2>プライバシーと販売条件</h2>
<ul>
  <li><a href="/privacy-policy.html#${id}">プライバシーポリシー</a>（共通の方針と、このソフトウェアの取り扱い）</li>
</ul>
<p>お問い合わせ: <a href="mailto:support@toriinthecat.com">support@toriinthecat.com</a></p>
`,
  en: `<!-- {"title": "${name}", "description": "About ${name}.", "nav": "software", "section": "${id}", "page": "index"} -->
<h1>${name}</h1>
<p class="lead"><span class="ph">One-line description</span></p>

<h2>Overview</h2>
<p class="ph-block">Description, supported systems, where to get it, screenshots.</p>

<h2>Privacy and terms of sale</h2>
<ul>
  <li><a href="/privacy-policy.html#en-${id}">Privacy policy</a> (the common policy and this program's part)</li>
</ul>
<p>Contact: <a href="mailto:support@toriinthecat.com">support@toriinthecat.com</a></p>
`,
};

for (const [lang, html] of Object.entries(pages)) {
  const file = join(root, "src", "pages", ...(lang === "en" ? ["en"] : []), id, "index.html");
  if (existsSync(file)) {
    console.error(`${file} exists; nothing changed`);
    process.exit(1);
  }
}
for (const [lang, html] of Object.entries(pages)) {
  const file = join(root, "src", "pages", ...(lang === "en" ? ["en"] : []), id, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

list.software.unshift({
  id,
  name,
  featured: false,
  status: "coming",
  platforms: { ja: "準備中", en: "Coming" },
  tagline: { ja: `${name} の一行の紹介`, en: `One-line description of ${name}` },
  summary: { ja: `${name} の紹介`, en: `About ${name}` },
  links: [["index", "概要", "Overview"]],
  menu: [["index", "概要", "Overview"]],
});
writeFileSync(listPath, JSON.stringify(list, null, 2) + "\n");
console.log(`added ${id}: edit src/software.json and src/pages/${id}/, src/pages/en/${id}/, then the privacy policy`);
