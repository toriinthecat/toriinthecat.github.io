// Builds the site: every page in src/pages becomes a full HTML file in docs/ (the folder GitHub
// Pages serves). No dependencies; run `node tools/build.mjs`.
//
// A page starts with one comment holding its settings as JSON:
//   <!-- {"title": "...", "description": "...", "nav": "software", "section": "vault-zip", "page": "faq"} -->
// `nav` marks the item of the top menu, `section` adds a product's own menu and `page` marks
// its item. The language comes from the path (`en/...` is English). The other language's
// page is linked when it exists.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, copyFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagesDir = join(root, "src", "pages");
const staticDir = join(root, "src", "static");
const out = join(root, "docs");

const T = {
  ja: {
    site: "Toriinthecat",
    nav: [
      ["top", "/", "トップ"],
      ["software", "/software/", "ソフトウェア"],
      ["privacy", "/privacy-policy.html", "プライバシーポリシー"],
      ["tokushoho", "/tokushoho.html", "特定商取引法に基づく表記"],
      ["security", "/security.html", "セキュリティ"],
      ["support", "/support.html", "応援する"],
      ["about", "/about.html", "運営について"],
    ],
    other: "English",
    skip: "本文へ移動",
    status: { available: "公開中", coming: "準備中", ended: "公開終了" },
    featured: "おすすめ",
    devlogTitle: "開発記、書いています（note）",
    devlogText: "ソフトができるまでの過程を、note に書いています。どう設計したか、どこでつまずいたか、どうやって確かめたか、なぜそう決めたか。うまくいかなかったことも、そのまま書いています。",
    devlogButton: "note で開発記を読む",
    socialNote: "お問い合わせはメールでお願いします。SNS のメッセージには、お返事できないことがあります。",
    supportTitle: "応援してくださる方へ",
    supportText: "Vault-ZIP は、個人なら無料で使えます。気に入っていただけたら、私の活動を応援してもらえるとうれしいです。",
    supportMore: "応援のしかた →",
    supportButton: "応援する",
    supportPending: "準備中",
    supportNav: "応援する",
    footer: "Toriinthecat",
    contact: "お問い合わせ",
  },
  en: {
    site: "Toriinthecat",
    nav: [
      ["top", "/en/", "Home"],
      ["software", "/en/software/", "Software"],
      ["privacy", "/privacy-policy.html#en", "Privacy policy"],
      ["tokushoho", "/tokushoho.html", "Legal notice (Japanese)"],
      ["security", "/en/security.html", "Security"],
      ["support", "/en/support.html", "Support"],
      ["about", "/en/about.html", "About"],
    ],
    other: "日本語",
    skip: "Skip to content",
    status: { available: "Available", coming: "Coming", ended: "Discontinued" },
    featured: "Featured",
    devlogTitle: "A development journal on note",
    devlogText: "On note (in Japanese) we write about how the software comes together: how it was designed, where it got stuck, how it was tested and why things were decided, including what did not work.",
    devlogButton: "Read the journal on note",
    socialNote: "For enquiries, please use email. Messages on social media may go unanswered.",
    supportTitle: "If you'd like to support me",
    supportText: "Vault-ZIP is free for individuals. If you enjoy it, I would be very happy if you supported my work.",
    supportMore: "How to support →",
    supportButton: "Support",
    supportPending: "coming soon",
    supportNav: "Support",
    footer: "Toriinthecat",
    contact: "Contact",
  },
};

const CONTACT = "support@toriinthecat.com";

// The software list (src/software.json) drives the top page, /software/ and every program's side
// menu. A page writes <!-- software:list --> (all programs) or <!-- software:featured --> (the
// featured ones, larger) where the generated list goes.
const SOFTWARE = JSON.parse(readFileSync(join(root, "src", "software.json"), "utf8")).software;
const STATUSES = ["available", "coming", "ended"];
for (const s of SOFTWARE) {
  if (!/^[a-z0-9-]+$/.test(s.id)) throw new Error(`software.json: bad id ${s.id}`);
  if (!STATUSES.includes(s.status)) throw new Error(`software.json: ${s.id}: status must be one of ${STATUSES}`);
  for (const [, , href] of s.stores ?? []) {
    if (!/^https:\/\//.test(href)) throw new Error(`software.json: ${s.id}: store link must start with https://`);
  }
  for (const lang of ["ja", "en"]) {
    for (const [key] of s.menu) {
      const p = join(pagesDir, ...(lang === "en" ? ["en"] : []), s.id, `${key}.html`);
      if (!existsSync(p)) throw new Error(`software.json: ${s.id}: menu page ${relative(root, p)} is missing`);
    }
  }
}
const sectionsFor = (lang) =>
  Object.fromEntries(
    SOFTWARE.map((s) => [s.id, { name: s.name, pages: s.menu.map(([key, ja, en]) => [key, lang === "en" ? en : ja]) }]),
  );
for (const lang of ["ja", "en"]) T[lang].sections = sectionsFor(lang);

function softwareCards(lang, onlyFeatured) {
  const t = T[lang];
  const prefix = lang === "en" ? "/en" : "";
  const items = SOFTWARE.filter((s) => !onlyFeatured || s.featured).map((s) => {
    const base = `${prefix}/${s.id}/`;
    const links = [
      ...s.links.map(([key, ja, en]) => `<a href="${base}${key === "index" ? "" : key + ".html"}">${lang === "en" ? en : ja}</a>`),
      ...(s.stores ?? []).map(([ja, en, href]) => `<a href="${esc(href)}" rel="noopener">${lang === "en" ? en : ja}</a>`),
    ].join(lang === "en" ? " · " : " ・ ");
    const badges =
      (s.featured && !onlyFeatured ? `<span class="badge badge-featured">${t.featured}</span>` : "") +
      `<span class="badge badge-${s.status}">${t.status[s.status]}</span>`;
    return `  <li${s.featured ? ' class="featured"' : ""}>
    <div class="name">${s.icon ? `<img class="app-icon" src="${esc(s.icon)}" alt="" width="48" height="48" loading="lazy">` : ""}<a href="${base}">${esc(s.name)}</a>${badges}</div>
    <div class="meta">${esc(s.platforms[lang])}</div>
    <p>${esc((onlyFeatured ? s.summary : s.tagline)[lang])}</p>
    <p>${links}</p>
  </li>`;
  });
  return `<ul class="apps${onlyFeatured ? " apps-featured" : ""}">\n${items.join("\n")}\n</ul>`;
}

// Accounts (src/social.json). <!-- social:links --> is the row of buttons, <!-- social:devlog -->
// the block about the development journal. An empty url is a placeholder.
const SOCIAL_FILE = JSON.parse(readFileSync(join(root, "src", "social.json"), "utf8"));
const SOCIAL = SOCIAL_FILE.social;
const SUPPORT = SOCIAL_FILE.support ?? { service: "", url: "" };
for (const s of [...SOCIAL, { id: "support", ...SUPPORT }]) {
  if (s.url && !/^https:\/\//.test(s.url)) throw new Error(`social.json: ${s.id}: url must start with https://`);
}

// <!-- support:button --> is the button to the payment service's page (a placeholder while the
// url is empty); <!-- support:card --> is a small block that leads to /support.html.
function supportButton(lang) {
  const t = T[lang];
  const label = SUPPORT.service ? `${t.supportButton}（${esc(SUPPORT.service)}）` : t.supportButton;
  return SUPPORT.url
    ? `<p><a class="button" href="${esc(SUPPORT.url)}" rel="noopener">${label}</a></p>`
    : `<p><span class="button ph">${t.supportButton}（${t.supportPending}）</span></p>`;
}
function supportCard(lang) {
  const t = T[lang];
  const href = lang === "en" ? "/en/support.html" : "/support.html";
  return `<div class="support-card">
  <p class="support-title">${t.supportTitle}</p>
  <p>${t.supportText}</p>
  <p><a href="${href}">${t.supportMore}</a></p>
</div>`;
}
const DEVLOG = SOCIAL.find((s) => s.devlog);

function socialLink(s, cls = "") {
  return s.url
    ? `<a class="sns ${cls}" href="${esc(s.url)}" rel="me noopener">${esc(s.name)}</a>`
    : `<span class="sns ph ${cls}">${esc(s.name)}</span>`;
}

function socialLinks(lang) {
  const t = T[lang];
  return `<p class="sns-row">${SOCIAL.map((s) => socialLink(s, s.devlog ? "sns-devlog" : "")).join(" ")}</p>
<p class="note">${t.socialNote}</p>`;
}

function devlogBlock(lang) {
  if (!DEVLOG) return "";
  const t = T[lang];
  const link = DEVLOG.url
    ? `<a class="button" href="${esc(DEVLOG.url)}" rel="me noopener">${t.devlogButton}</a>`
    : `<span class="button ph">${t.devlogButton}</span>`;
  return `<div class="devlog">
  <p class="devlog-title">${t.devlogTitle}</p>
  <p>${t.devlogText}</p>
  <p>${link}</p>
</div>`;
}

function expand(body, lang) {
  let zoomCount = 0;
  const zoomLayers = [];
  return body
    .replace(/<!--\s*software:list\s*-->/g, () => softwareCards(lang, false))
    .replace(/<!--\s*software:featured\s*-->/g, () => softwareCards(lang, true))
    .replace(/<!--\s*social:links\s*-->/g, () => socialLinks(lang))
    .replace(/<!--\s*social:devlog\s*-->/g, () => devlogBlock(lang))
    .replace(/<!--\s*support:button\s*-->/g, () => supportButton(lang))
    .replace(/<!--\s*support:card\s*-->/g, () => supportCard(lang))
    // A screenshot opens at full size on the same page (a CSS :target overlay, no script).
    .replace(/<img src="(\/assets\/vault-zip\/[^"]+)"([^>]*)>/g, (_, src, rest) => {
      const id = `zoom-${++zoomCount}`;
      zoomLayers.push(`<a class="lightbox" id="${id}" href="#_" aria-label="${lang === "en" ? "Close" : "閉じる"}"><img src="${src}"${rest}></a>`);
      return `<a class="zoom" href="#${id}" title="${lang === "en" ? "Click to enlarge" : "クリックで拡大"}"><img src="${src}"${rest}></a>`;
    })
    // Esc closes the enlarged screenshot (the overlay itself works without the script).
    + (zoomLayers.length
      ? "\n" + zoomLayers.join("\n") + "\n<script>document.addEventListener(\"keydown\",function(e){if(e.key===\"Escape\"&&location.hash.indexOf(\"#zoom-\")===0){location.hash=\"_\";}});</script>\n"
      : "");
}

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** `vault-zip/faq.html` → `/vault-zip/faq.html`; `index.html` files become their folder. */
function urlOf(rel) {
  const u = "/" + rel.split(sep).join("/");
  return u.endsWith("/index.html") ? u.slice(0, -"index.html".length) : u;
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function layout({ lang, meta, body, url, otherUrl }) {
  const t = T[lang];
  const prefix = lang === "en" ? "/en" : "";
  const nav = t.nav
    .map(([key, href, label]) => `<li><a href="${href}"${meta.nav === key ? ' aria-current="page"' : ""}>${label}</a></li>`)
    .join("");
  let sub = "";
  if (meta.section) {
    const s = t.sections[meta.section];
    const items = s.pages
      .map(([key, label]) => {
        const href = `${prefix}/${meta.section}/${key === "index" ? "" : key + ".html"}`;
        return `<li><a href="${href}"${meta.page === key ? ' aria-current="page"' : ""}>${label}</a></li>`;
      })
      .join("");
    sub = `<nav class="subnav" aria-label="${s.name}"><p class="subnav-name">${s.name}</p><ul>${items}</ul></nav>`;
  }
  const title = meta.title === t.site ? t.site : `${meta.title} - ${t.site}`;
  const alt = otherUrl
    ? `<a class="lang" href="${otherUrl}" hreflang="${lang === "ja" ? "en" : "ja"}" lang="${lang === "ja" ? "en" : "ja"}">${t.other}</a>`
    : "";
  const altLink = otherUrl ? `\n<link rel="alternate" hreflang="${lang === "ja" ? "en" : "ja"}" href="https://toriinthecat.com${otherUrl}">` : "";
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(meta.description ?? "")}">
<link rel="canonical" href="https://toriinthecat.com${url}">${altLink}
<link rel="stylesheet" href="/assets/site.css">
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" href="/assets/icons/favicon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/assets/icons/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
</head>
<body>
<a class="skip" href="#main">${t.skip}</a>
<header class="site-header">
  <div class="wrap header-row">
    <a class="logo" href="${prefix}/"><img src="/assets/icons/toriinthecat-mark.png" alt="" width="32" height="32"><b>Tori<span>in</span>thecat</b></a>
    ${alt}
  </div>
  <nav class="wrap topnav" aria-label="${t.site}"><ul>${nav}</ul></nav>
</header>
<div class="wrap page${sub ? " with-sub" : ""}">
${sub}<main id="main">
${body.trim()}
</main>
</div>
<footer class="site-footer">
  <div class="wrap">
    <p>${t.footer} ・ ${t.contact}: <a href="mailto:${CONTACT}">${CONTACT}</a></p>
    <p class="sns-row">${SOCIAL.map((s) => socialLink(s)).join(" ")}</p>
    <p>&copy; Toriinthecat</p>
  </div>
</footer>
</body>
</html>
`;
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const pages = walk(pagesDir).filter((p) => p.endsWith(".html"));
const urls = new Set(pages.map((p) => urlOf(relative(pagesDir, p))));
for (const file of pages) {
  const rel = relative(pagesDir, file);
  const src = readFileSync(file, "utf8");
  const m = src.match(/^<!--\s*(\{[\s\S]*?\})\s*-->/);
  if (!m) throw new Error(`${rel}: the settings comment is missing`);
  // A real direction override (U+202A-202E, U+2066-2069) reorders the text around it on screen;
  // write such characters as "U+202E" instead.
  const bidi = src.search(/[‪-‮⁦-⁩]/);
  if (bidi >= 0) throw new Error(`${rel}: a text-direction control character at offset ${bidi}; write it as U+XXXX`);
  const meta = JSON.parse(m[1]);
  const lang = rel.startsWith("en" + sep) ? "en" : "ja";
  const url = urlOf(rel);
  const otherUrl = meta.alt ?? (lang === "en" ? url.slice(3) : "/en" + url);
  const target = join(out, rel);
  mkdirSync(dirname(target), { recursive: true });
  if (meta.section && !T[lang].sections[meta.section]) throw new Error(`${rel}: section ${meta.section} is not in software.json`);
  writeFileSync(target, layout({ lang, meta, body: expand(src.slice(m[0].length), lang), url, otherUrl: urls.has(otherUrl.split("#")[0]) ? otherUrl : null }));
}
for (const file of walk(staticDir)) {
  const target = join(out, relative(staticDir, file));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(file, target);
}

// Every link inside the site must lead to a file (anchors are not checked).
let broken = 0;
for (const file of walk(out).filter((p) => p.endsWith(".html"))) {
  const html = readFileSync(file, "utf8");
  for (const [, href] of html.matchAll(/(?:href|src)="(\/[^"#]*)/g)) {
    const path = join(out, href.endsWith("/") ? href + "index.html" : href);
    if (!existsSync(path)) {
      console.error(`broken link in ${relative(out, file)}: ${href}`);
      broken++;
    }
  }
}
if (broken > 0) process.exit(1);
console.log(`built ${pages.length} pages into docs/`);
