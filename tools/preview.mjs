// A private preview of the whole site as ONE HTML file (for a phone, without publishing):
// `node tools/build.mjs && node tools/preview.mjs` → preview/index.html (not committed).
// Every built page becomes a hidden <section>; links inside the site become #p-<page> and a small
// script shows the page named in the hash. The stylesheet is inlined. docs/ is not changed.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "docs");

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** "/vault-zip/specs.html" → "p-vault-zip-specs"; "/" → "p-top"; "/en/" → "p-en". */
function pageId(path) {
  let p = path.replace(/index\.html$/, "").replace(/\.html$/, "").replace(/^\/|\/$/g, "");
  return "p-" + (p === "" ? "top" : p.replace(/\//g, "-"));
}

const files = walk(out).filter((f) => f.endsWith(".html"));
const ids = new Set(files.map((f) => pageId("/" + relative(out, f).split(sep).join("/"))));
const sections = [];
for (const f of files) {
  const url = "/" + relative(out, f).split(sep).join("/");
  const html = readFileSync(f, "utf8");
  const title = (html.match(/<title>([^<]*)<\/title>/) ?? [, url])[1];
  let body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  body = body
    .replace(/<a class="skip"[^>]*>[^<]*<\/a>/, "")
    .replace(/href="(\/[^"#]*)(#[^"]*)?"/g, (m, path) => {
      const id = pageId(path);
      return ids.has(id) ? `href="#${id}"` : m;
    })
    .replace(/\sid="main"/g, "");
  sections.push(`<section class="pv-page" id="${pageId(url)}" data-title="${title}" hidden>\n${body}\n</section>`);
}

const css = readFileSync(join(out, "assets", "site.css"), "utf8");
const page = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>toriinthecat.com プレビュー</title>
<style>
${css}
.pv-banner { position: sticky; top: 0; z-index: 10; background: #6b5200; color: #fff; font-size: 0.8rem; padding: 6px 12px; text-align: center; }
</style>
</head>
<body>
<div class="pv-banner">非公開のプレビュー（${new Date().toISOString().slice(0, 10)}）。黄色の点線は未記入の箇所です</div>
${sections.join("\n")}
<script>
(function () {
  var pages = document.querySelectorAll(".pv-page");
  var current = null;
  function show() {
    var h = location.hash.slice(1);
    var target = h && document.getElementById(h);
    if (target && target.classList.contains("pv-page")) {
      if (current) current.hidden = true;
      target.hidden = false;
      current = target;
      document.title = target.getAttribute("data-title");
      window.scrollTo(0, 0);
      return;
    }
    if (!current) {
      current = document.getElementById("p-top");
      current.hidden = false;
    }
    if (h) {
      var inPage = current.querySelector("[id='" + h.replace(/'/g, "") + "']");
      if (inPage) inPage.scrollIntoView();
    }
  }
  window.addEventListener("hashchange", show);
  show();
})();
</script>
</body>
</html>
`;
mkdirSync(join(root, "preview"), { recursive: true });
writeFileSync(join(root, "preview", "index.html"), page);
console.log(`preview/index.html: ${sections.length} pages, ${(page.length / 1024).toFixed(0)} KiB`);
