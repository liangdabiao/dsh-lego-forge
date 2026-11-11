# Reference — outside reading

Three design documents from another LEGO generator, kept here verbatim because their method outlives their toolchain. **Read them
for judgement, not for instructions.** Nothing in this folder is part of the pipeline, and no command in it exists here.

## Where they come from

| file | source | licence |
|---|---|---|
| `visual-design.md` | `ldraw-nova/docs/agent/visual-design.md` | CC BY-SA 4.0 |
| `geometry.md` | `ldraw-nova/docs/agent/geometry.md` | CC BY-SA 4.0 |
| `vehicles.md` | `ldraw-nova/docs/agent/vehicles.md` | CC BY-SA 4.0 |

Copied 2026-10-29. Text is unmodified; relative links inside them (`../../examples/…`) point into a repository that is not here, so
they are dead. Attribution and licence travel with the text — if any of it is quoted into a delivered document, keep the note.

## Why they are not instructions

That project places parts by explicit transform; this one places volume and packs it. The difference shows up in three places, and
each one makes a literal reading wrong:

- **Axes.** They use LDraw units: X across, **−Z forward**, **negative Y up**, Y=0 at the road or the stud base. Here X/Z are stud
  integers, **+Z is the front**, Y is plates **increasing upward**, and a part's `y` is its bottom. Every coordinate, every `Y=-30`
  and every "front −Z" in those files is wrong for this repository.
- **Units of stacking.** They count 20 LDU per stud, 24 per brick, 8 per plate and allow 10-LDU half-stud offsets. There are no
  half-studs here: `x`/`z` are whole studs, `y` is whole plates, and a part either sits on the grid or the checker rejects it.
  The 24/8/20 ratio is the same fact as our 3 plates per brick — useful to know, not something to compute with.
- **Commands.** `./ldraw-agent catalog parts …`, `design palettes`, `vehicle check`, `snap`, `provided LDCad shadow metadata`,
  Jev reranking — none of these exist in this checkout. Their part ids are LDraw filenames; ours are BrickLink-style ids in
  `engine/parts/catalog.json`. Use `node bin/lego.mjs parts <word>` and `node bin/lego.mjs part <id>` instead.

## What to take from each

**`visual-design.md`** — the composition questions (thumbnail test, focal hierarchy, quiet surfaces, palette roles) and the four ways
to get depth on a flat facade. Its `palette roles` paragraph is the clearest statement anywhere of why a wall reading as one cream
slab is a design failure. Distilled for this repo in `docs/TECHNIQUES.md` § Composition and § Depth.

**`geometry.md`** — the stacking rule `upper.underside = lower.top`, and the honesty chapter: a geometry report proves geometry, not
strength. The first is restated in our own coordinates in `docs/TECHNIQUES.md` § Stacking; the second is now printed at the end of
every `report.txt`.

**`vehicles.md`** — "build from the inside out", seven steps, wheels before bodywork, dedicated fittings before brick substitutes.
Restated for `kit.vehicle` / `kit.wheels` in `docs/TECHNIQUES.md` § Vehicles. Its wheel-package tables (4600/4624/3641, 6157/6014b/6015)
are measurements of parts we do not have in the catalogue — do not copy the numbers.

## What does not transfer

- Its validation vocabulary (`confirmed_components`, `optimistic_components`, `not_applicable`) — we have a real pin graph, so our
  failures are failures, not "unconfirmed".
- Its tolerance for `rigid`-style grouping to explain away a loose part. Here a side-stud mount is either on the stud or it is an error.
- Its part and colour inventories. We ship 475 curated parts; a technique that needs a part outside them is not available until it is
  baked (`tools/bake.mjs` + `tools/partlist.txt`).
