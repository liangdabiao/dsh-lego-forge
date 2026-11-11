# Reference — learning from official models

Numbers beat adjectives. When a wall looks wrong and you cannot say why, the fastest correction is a measurement from a set that got
it right. This file records what was measured, how, and what it means for a build here.

The source library is **not in this repository** (407 MB, 1,821 models from the LDraw.org corpus, kept in a private local checkout).
Nothing below requires it at build time; it is a place to look things up.

## Three levels of looking

Ask one question per level, and stop at the level that answers it. Most "this looks flat" problems are answered at level 1.

| level | what you read | what it answers | how, here |
|---|---|---|---|
| **1 · whole model** | part count, kind count, the brick/plate/tile split, SNOT density, overall bounds | is my scale, my material mix, my density of detail in the right range? | the table below |
| **2 · submodel** | one `0 FILE` block: how a bay, a storey or a roof is actually assembled | how do they build *this thing* — a bay window, a cornice, a corner? | `awk '/^0 FILE/{f=$0} f~/cornice/{print}' model.mpd` |
| **3 · part** | a single id: its studs, sockets, height in plates, side studs | will this part do what I think at the size I need? | `node bin/lego.mjs part <id>` |

Level 2 is where most of the value is and it is the level people skip. A whole-model silhouette tells you a bay window is 4 studs wide;
only the submodel tells you they got the projecting sill by putting a plate under an inverted slope, with a bracket behind it.

`node bin/lego.mjs parts <word>` searches our 475 curated parts by name; `part <id>` prints studs, sockets and every side stud with its
face and height. Those two commands answer level 3 for anything we can actually build with.

## The measured baseline

Nine modular buildings, counted from their MPD placements (`1 …` lines that reference a `.dat`, ignoring `.ldr` submodel calls, so no
double counting).

| set | parts | kinds | bricks | plates | tiles | SNOT parts |
|---|---:|---:|---:|---:|---:|---:|
| 10218 Pet Shop | 2,003 | 209 | 753 | 571 | 300 | 3.0% |
| 10224 Town Hall | 2,463 | 210 | 961 | 633 | 370 | 2.5% |
| 10243 Parisian Restaurant | 2,271 | 271 | 623 | 650 | 370 | 4.7% |
| 10246 Detective's Office | 2,323 | 295 | 671 | 627 | 377 | 3.4% |
| 10251 Brick Bank | 2,720 | 287 | 655 | 686 | 518 | 5.0% |
| 10264 Corner Garage | 2,364 | 326 | 641 | 655 | 508 | 4.1% |
| 10270 Bookshop | 2,541 | 289 | 880 | 599 | 468 | 5.6% |
| 10278 Police Station | 2,987 | 311 | 842 | 874 | 527 | 4.9% |
| 10297 Boutique Hotel | 3,415 | 384 | 863 | 801 | 618 | 4.2% |
| **mean** | **2,565** | **287** | — | — | — | **4.2%** |

Four ratios fall out of it, and each one corrects a specific mistake:

**1. Plates nearly equal bricks — 6,889 bricks to 6,096 plates, 1.13 : 1.** From 10243 onward plates are ahead in four of six sets. A
facade is a plate build, not a brick build. Plates are how you get a sill one plate proud, a cornice three plates deep, a step, a
reveal, a 2-plate band between storeys. A model that is mostly bricks has no surface relief — it can only have colour changes.

**2. Tiles are 17.6% of everything.** Not a finishing touch — one part in six. Floors, pavements, roofs, fascias, window heads,
furniture tops. If our own report says 3% tiles, the model is going to read as a stud-covered lump no matter what the silhouette does.

**3. SNOT parts are 2.5–5.6%, mean 4.2% — and they are concentrated, not spread.** Roughly one in twenty-four parts. The useful
implication is the opposite of "add more SNOT": a facade with SNOT on every storey at every bay is already at double the official rate.
The official sets spend it in two or three places — a shop fascia, a window reveal, a roofline — and leave the rest of the wall as
ordinary masonry. Spread thin, it stops reading as a deliberate smooth face and starts reading as noise.

**4. Kind count is about 11% of part count.** 287 kinds for 2,565 parts. Repetition is deliberate: one window design repeated six times
reads as architecture, six different windows read as a hobby. Our own sets run 48–74 kinds for 800–1,400 parts, which is *more* varied
per part than the official sets — worth knowing before adding another one-off detail.

**Comparing your own build.** `report.txt` prints the same two ratios on its second line, so the comparison is arithmetic rather than
argument:

```
parts by kind: 798 brick · 355 plate · 184 tile · 0 slope — 0.44 plates per brick, 13% tiles (official modulars: 1.13 and 18%)
```

If the plates-per-brick figure is near 1 and the tile share is near 18%, the flatness problem is *not* the material mix and you should
look at the composition questions instead. If it is far below, no amount of ornament will fix the surface — the wall has nothing in it
that can cast a shadow.

## Worked example — reading the table against a build

The St Paul's facade came out at 17% "specialty" and 53% Tan, and looked like one cream slab. The table says three things:

- **Kinds: 48 for 1,395 parts = 7.4%**, under the official 11%. Kind count was not the problem — if anything the model had too many
  one-off parts, not too few.
- **Plates per brick: 0.44** (above). This is the failure.
- **Colour: 53% dominant is fine.** Official bodies run 40–60%. What failed was the secondary: Dark Tan at 21%, the same hue one step
  darker. A large warm mass needs trim that is cool, not darker — 10243 carries a warm body because its trim is sand green and dark
  blue. Contrast in hue, not in value. The table does not measure this; the lesson is visible in the sets anyway.

## Limits of these numbers

- Nine sets, all modular buildings from 2011–2021. Not houses, not Asian architecture, not anything before 2010. Use them as a range,
  not a target.
- Interior furniture is counted the same as facade. A set with a furnished interior has a lower exterior tile rate than the 17.6%.
- "SNOT part" means a part with at least one stud whose axis is not vertical, found by walking the LDraw geometry and testing each stud
  matrix. It counts a bracket even if the builder used it as an ordinary support. It undercounts nothing, but it does over-attribute.
- Kind counts are affected by printed and patterned variants (a printed tile counts as its own kind), which inflates them slightly.
- Part names come from the LDraw library headers; 16% of the ids used in these sets have no local header, so the brick/plate/tile split
  is a floor, not exact.

## Reproducing

The counts above are `1`-line placements per `.dat` reference, resolved recursively through `.mpd` definitions. Stud directions come from
accumulating each type-1 matrix down the primitive tree and testing whether the stud axis `M · (0,1,0)` is within 0.5 of vertical.
Verified against known parts: `4733` → 4 sideways, `11211` → 2, `87087` → 1, `3004` → 0.
