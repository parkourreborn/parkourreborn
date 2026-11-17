# Reborn AI knowledge base

Reborn AI answers game questions from the markdown in `knowledge/`. `scripts/kb/build.mjs` turns it into `src/generated/kb.json` (git-ignored, built before dev, build and typecheck). At request time the question is keyword-searched (`src/lib/reborn-ai/kb-search.ts`), Jev picks the relevant chunks, and a free OpenRouter model writes the answer from them.

## Commands

| Command | What it does |
| --- | --- |
| `npm run kb:build` | Builds `kb.json` and fails on broken docs. |
| `npm run kb:check` | Same, plus warnings (shared aliases, very short docs). |
| `npm run kb:wiki` | Pulls parkourreborn.wiki into `knowledge/`, then builds. |
| `npm run kb:eval` | Checks that known questions still find the right docs. Needs Node 22.18+. |

## Syncing from the wiki

`scripts/kb/sync-wiki.mjs` reads the wiki through its MediaWiki API (`https://parkourreborn.wiki/w/api.php`). `scripts/kb/wiki-pages.mjs` says which wiki page feeds which doc. Every entry of the wiki's Update Logs also becomes its own doc in `knowledge/updates/`, and the update timeline is rebuilt from them.

The sync only writes what it owns, so your own edits are safe:

- **Inside a doc**, only the text between `<!-- wiki:start ... -->` and `<!-- wiki:end -->` is replaced. Write your own notes above or below the markers. Many docs keep their older hand-written text below the markers under `## Quick Facts`.
- **In the frontmatter**, only the `wiki_aliases:` list is replaced. `title`, `category`, `aliases`, `tags`, `summary` and anything else are yours. The build merges `wiki_aliases` into `aliases`.
- **Docs without markers are never touched.** This covers everything the wiki doesn't feed: players (including the hand-written people pages), glossary, Wasans, rules, recipes and so on. To add a player, just add a file to `knowledge/players/`.
- **New wiki pages or new update log entries** create new docs. Add a line to `wiki-pages.mjs` to bring in another wiki page.

Useful flags: `node scripts/kb/sync-wiki.mjs --dry` lists what would change without writing. `--adopt` takes over an existing doc that has no markers yet; everything above its `## Quick Facts` section is treated as wiki text.

### Running it on GitHub

`.github/workflows/kb-wiki-sync.yml` only runs by hand: Actions > "Sync knowledge base from the wiki" > Run workflow. It checks out `preview`, runs `kb:wiki` and `kb:eval`, and commits `knowledge/` to `preview` only if the eval passes. A failing eval fails the job instead of committing. GitHub only lists the workflow once the file is on `main`.

### Techs are not in the KB

Movement techs come only from the site's tech list (the `movement` Firestore collection, shown on the tech list page). The sync keeps the wiki's Movement page up to its abilities and mechanics and cuts everything from the "Gearless" techs tab on (`cutFrom` in `wiki-pages.mjs`). The wiki's Community Techniques page isn't synced. To add or fix a tech, edit the tech list, not `knowledge/`.

## Retrieval eval

`scripts/kb/eval-questions.json` lists questions with the doc (and optionally the section) the search has to return in its top 5. It runs offline with no API keys. When Reborn AI misses something it should know, add the question here, fix the KB or search, and rerun `npm run kb:eval -- -v` to see the top results for every question.

## Answer rules worth knowing

- Search results often only mention the subject in passing. The prompt tells the model to use only facts that help answer the question. Jev's relevance check ignores passing mentions, and Jev's answer check triggers one rewrite when an answer adds unasked rules, warnings or side notes. This is what stops "techs aren't bugs" from showing up in a Wumpy answer.
- A tech-list lookup (`search_techs` in `src/lib/reborn-ai/tools.ts`) sends each step with a short note on what it does inside a tech (`src/lib/reborn-ai/movement-steps.ts`, condensed from the guide's ability descriptions). The prompt tells the model to keep the list's steps exactly, walk through them in order, and add nothing the notes don't say. The full descriptions aren't sent, because free models copied unrelated parts of them (inputs, "powerslide toward a low obstacle") into tech answers. When the tech list gets a new step name, add a note for it there. Until then the step falls back to the guide's description without its input and unlock lines.
- When nothing narrower answers a question, the model gets a large slice of the guide: the docs the question touches first, capped at 160,000 characters so it fits free models' context windows.
- Jev's page catalog leaves out patch notes and people pages. Search finds those reliably by version number or name, and every catalog page is one more Jev question.
