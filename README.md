# toriinthecat.com

The site of Toriinthecat: one site for every program the trade name has published, publishes and
will publish. The trade name, the software list, and one section per program. Japanese at `/`,
English at `/en/`. Plain HTML and one CSS file. A script is allowed (decision 2026-11-06); today only the enlarged screenshots use one (Esc closes them).

- Pages: `src/pages/` (one file per page; the first line is a comment with its settings, see `tools/build.mjs`).
- The software list: `src/software.json` (see below).
- Files copied as they are: `src/static/` (CSS, icon, `CNAME`, `.nojekyll`, `security.txt`).
- Build: `node tools/build.mjs` writes `docs/`. It fails on a link inside the site that leads nowhere, on a program whose menu names a missing page, and on a page whose section is not in the list.
- Look at it: `node tools/serve.mjs`, then open http://127.0.0.1:8080/.
- Private preview on a phone (nothing published): `node tools/preview.mjs` after a build writes `preview/index.html`, the whole site in one file (links become `#p-<page>`); `preview/` is not committed.
- Publishing: GitHub Pages from the `main` branch, folder `/docs`, custom domain `toriinthecat.com`.

Text marked `class="ph"` / `ph-block` (yellow, dashed) is a placeholder still to be written or confirmed.
The URLs `/privacy-policy.html` and `/tokushoho.html` must not change (store listings link to them).

## What is shared and what belongs to a program

| Shared by every program | Per program |
|---|---|
| The top page, `/software/`, header, footer, CSS | `src/pages/<id>/` and `src/pages/en/<id>/` (any number of pages) |
| `/privacy-policy.html` part 1 (operator, basic policy, children, changes) | Its part in part 2 of `/privacy-policy.html` (anchor `#<id>`, English `#en-<id>`); a long one gets its own `privacy.html` and a short summary with a link in part 2 |
| `/tokushoho.html` operator table | Its own table in `/tokushoho.html` (anchor `#<id>`) if it is sold |
| `/security.html`, `/.well-known/security.txt` | |

## The software list (`src/software.json`)

Newest first. Each entry: `id` (the folder name), `name`, `status` (`available`, `coming`, `ended`;
an ended program stays listed), `featured` (shown large on the top page; the program the site
puts first), `platforms`, `tagline` (the list), `summary` (the featured card), `links` (shown under
the card), `menu` (the program's side menu; each key is a page in both languages).

A page puts `<!-- software:list -->` or `<!-- software:featured -->` where the generated list goes.
`stores` (optional) adds outside links such as a store page: `[label ja, label en, https URL]`.

## Social media (`src/social.json`)

The accounts (note, X, Reddit, Instagram; the same four as Vault-ZIP's "About" screen). An empty
`url` shows as a placeholder. The one with `devlog: true` (note, the development journal) is the
site's selling point: `<!-- social:devlog -->` puts its block on a page (top page, each program's
overview), `<!-- social:links -->` the row of all accounts; the footer lists them on every page.

## Adding a program

1. `node tools/new-software.mjs <id> "<Name>"`: writes both languages' `index.html` and adds the entry (status `coming`).
2. Fill in the entry in `src/software.json` and the pages; add pages to `menu` as you write them.
3. Add its part to `/privacy-policy.html` part 2, Japanese and English.
4. If it is sold, add its table to `/tokushoho.html`.
5. `node tools/build.mjs`, look at it, commit.

When a program is withdrawn, set `status` to `ended` and keep its pages and its part of the policy.
