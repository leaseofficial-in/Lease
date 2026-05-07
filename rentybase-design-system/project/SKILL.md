---
name: rentybase-design
description: Use this skill to generate well-branded interfaces and assets for RentyBase — a rental management SaaS for India that connects landlords and tenants. Contains essential design guidelines, colors, type, fonts, logo assets, voice/tone rules, and UI kit components for prototyping or production work.
user-invocable: true
---

Read `README.md` first — it contains the full brand brief, content fundamentals, visual foundations, iconography rules, and the antipatterns this brand must never break.

Then explore:

- `colors_and_type.css` — every design token as CSS custom properties.
- `assets/` — logo lockups (horizontal, stacked, monochrome), favicon, brand mark, seal stamp.
- `preview/` — small specimen cards for every token.
- `ui_kits/app/` and `ui_kits/landing/` — high-fidelity recreations of the React Native app and the marketing site.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy the assets you need into your output folder and load `colors_and_type.css` directly. If working on production code, read the rules in `README.md` and lift token values into your codebase.

If invoked without other guidance, ask the user what they want to build, ask 3–5 focused questions about audience, surface, and fidelity, then act as an expert RentyBase designer who outputs HTML artifacts or production code as appropriate. Never break the brand antipatterns listed in `README.md`.
