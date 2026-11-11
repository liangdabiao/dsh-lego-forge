# Techniques

How LEGO designers make simple shapes look like the real thing. Each technique names the parts and, where one exists, the kit call.
A worked example that uses most of them: `examples/cottage/build.mjs` (renders: `examples/cottage/out/hero.png`, `sheet.png`).

## Composition — seven questions before the eighth detail

A checker can tell you the model holds together. It cannot tell you it is worth looking at. Answer these from the render, not from the
plan, and answer them in this order — a later yes cannot rescue an earlier no.

1. **At thumbnail size, is it obvious what this is?** Shrink the hero view to 100 px wide. If the subject is gone, the problem is the
   silhouette, and no amount of detail on top of it will help. Fix the masses first.
2. **Are the base, the storeys, the openings and the roof in convincing proportion?** Measure them against each other, not against a
   number: a door the height of a storey, a window band that is 60% of the wall, a base as tall as the plinth it carries.
3. **What is the focal point, and does it have two supporters?** One primary moment (a porch, a shopfront, an arch), two secondary ones
   that lead to it, then small accents. When everything is equally busy, the eye finds nothing and the model reads as flat even when it
   is not.
4. **Is there anywhere quiet?** A finished-looking facade has blank stretches — a wall between two pilasters, a plain roof plane. Quiet
   areas are what make the busy ones legible. If you cannot name a quiet area, the model has no rhythm.
5. **Does each repeated motif change with its job?** Six identical windows read as a design; six windows where the ground-floor pair is
   taller, the first-floor pair has a hood, and the top pair is a blind arch reads as architecture. Vary by function, not by accident.
6. **Is the entrance readable?** Door, path, step, something over it. A door hidden behind a tree or a parked vehicle is a door the viewer
   will not find, and an unreadable entrance costs more than any ornament gains.
7. **Did the detail introduce a problem?** Hovering parts, a tile that overlaps a window, a bracket with nothing behind it, an overhang
   with no support. This is the only question the checker also answers — pass it, then go back to question 1.

Two failure modes this list catches most often: polishing a silhouette that is wrong (questions 1–2), and covering a composition that is
wrong with ornament (questions 3–5). `docs/RUBRIC.md` scores the same things 1–10 when you want a number rather than a question.

## Depth — four ways to stop a facade reading as a slab

A wall that is one plane thick reads as a printed panel regardless of its colour. Every one of these costs plates, not parts, and each
creates a shadow line that survives at thumbnail size. Official modular buildings run about **17.6% tiles** and roughly **1.13 plates per
brick** — that ratio is what these four moves are made of (see `docs/REFERENCE.md`).

- **Recess the opening.** Put the glass one stud *behind* the wall plane and build the reveal as a 1-stud return. The frame then sits in
  a hole rather than on a surface. Cheapest version: `kit.window` at `z` one less than the wall face, with the wall's own cells around it.
- **Project the sill.** A plate course under the window that sticks out one stud, with the wall behind it cut back. The shadow under it is
  the whole effect; one plate is enough. Two studs reads as a balcony and needs support.
- **Layer the cornice.** Two or three plate courses, each stepping one stud further out than the one below, ending in a tile. This is the
  single highest-value line on any facade — it separates storeys and gives the eye a datum. Use `kit.studCourse` on the outermost course
  for a smooth face, and remember the course below has to carry it.
- **Hang a canopy.** `kit.awning` over a shopfront, or a bracket (`2436a`, `99780`) carrying an eave or a sign out over the street with
  nothing underneath. A bracket is the honest way to do this: it is a real part with a real interface, so the overhang has a reason.

One rule ties them together: **an offset needs a support you can point at.** A window head that projects must sit on the course below it;
a sill that projects must be held by something behind. If you cannot say which part carries the overhang, the checker will eventually say
it for you — see "not connected" in section 7 of `AGENTS.md`.

## Stacking and alignment

Parts sit on the grid or they do not sit at all. There is no half-stud offset here — `x` and `z` are whole studs and `y` is whole plates.

- A brick is 3 plates, a plate is 1, a tile is 1 and takes nothing on top.
- A part's `y` is its **bottom**. To put one part on another: `y_upper = y_lower + height_of_lower`. Stacking a plate on a brick at `y` = 0
  puts the plate at `y` = 3, and a brick on that plate at `y` = 4.
- **Nothing may be placed at the same cell as something else.** `m.box` refuses to overwrite; `m.cut` first, then `m.box`. A `m.part` may
  not overlap a `m.box` at all — if a round brick needs to sit in a wall, take the cell out of the wall first.
- **Openings must land on part boundaries.** An arch or a window needs a hole whose width and height are what a real arch or window spans
  (2, 4 or 6 studs; 2 or 3 bricks), and its bottom must be on a brick course or the part below will not be there.
- **A tile is a dead end.** Tiles are smooth and take nothing; building on one is not a small error, it is a floating part. If a surface
  must be both smooth and load-bearing, use plates and put the tiles on the edge.
- Side studs are at 1.75 plates above the part's base, not on a plate line — see the SNOT section below for what that means when you hang
  something on one.

## Buildings
- `kit.building` gives the whole structure (plinth, quoins, windows with sills, door, bands, roof, chimney, optional shopfront with sign and
  awning). Build several side by side for a street; then add what is particular to your subject.

## Walls
- **Plinth course**: the bottom brick of a building in a darker or stone colour (`m.box(…, 3, 'Dark Bluish Gray', { hollow: true })`,
  then the walls on top). Reads instantly as "built on a foundation".
- **Corner quoins**: every other brick up the corners in a contrasting colour (`m.cut` the corner cell, `m.brick('1x1', …)`).
- **Pilasters / columns**: 1×1 round bricks (3062b) or 2×2 round bricks (3941) stacked in front of or inside the wall line.
- **Window sills**: `kit.window(..., { sill: 'Light Bluish Gray' })` — a plate that sticks out one stud under the frame.
- **Bands and cornices**: one course of plates in a contrasting colour between storeys; a row of tiles or inverted slopes (3665a) under the eaves.
- **Texture**: log bricks (30136) for cabins, grille bricks (2877) for vents and shopfronts, headlight bricks (4070) for small square windows.
- Never leave a wall wider than ~8 studs and taller than 2 bricks without anything on it.
- **Plates outnumber bricks.** Official modular buildings run 1.13 plates per brick and 17.6% tiles; a brick-only wall can only change
  colour, never relief. If a facade reads flat, converting one course to plates that step out is cheaper than any new ornament
  (`docs/REFERENCE.md` has the measurements).

- **Awnings**: `kit.awning` — striped slopes reaching out from the wall over a shop window or door.
- **Lettering and signs**: `kit.sign` — silver letters on coloured tiles mounted on the wall (a shop name, a number "8", "TACOS").
  Short words read best (2–8 letters); put the sign above the door or along the fascia.
- **Smooth faces**: `kit.panel` — tiles mounted sideways (shop fascias, a screen on a monitor, the smooth front of an appliance).

## Roofs
- `kit.roof` for pitched roofs (45°), with `overhang: 1` when there is a slab under the eaves one stud wider than the walls.
- Roof colours: Dark Bluish Gray (slate), Reddish Brown / Dark Orange (tiles), Dark Red. Gable ends in the wall colour.
- Flat roofs: a plate slab with tiles on top and a 1-brick parapet; add a vent (grille tile) or a water tank (2×2 round bricks).
- Chimneys: a 2×2 column of bricks from the ground up past the ridge, outside a gable wall, capped with a plate.

## Ground and setting
- **Base**: `kit.base` — a 2-plate base that holds together. Size it 2–4 studs bigger than the subject on each side; empty base reads as unfinished.
- **Paths and pavements**: tiles (`m.box(x, y, z, w, d, 1, 'Tan', { kind: 'tile' })`), leaving studs on grass.
- **Water**: `kit.water` (smooth tiles with glints). Stones at its edge: 1×1 round tiles. Lily pads: round tiles set into the water.
- **Islands, hills, cliffs**: `kit.island` (irregular outline, sand rim, rock relief, a flat terrace for a building) over `kit.water`;
  `kit.rocks` for a single outcrop. Never a stepped rectangle.
- **Beach**: `kit.palm`, `kit.parasol`, sand (Tan) ground, water with a sand rim.
- **Plants**: `kit.tree` (leafy), `kit.pine`, `kit.bush`, `kit.flower`, `kit.flowerBed`. Two or three plants of different heights beat a row of identical ones.
- **Street furniture**: `kit.lamp`, `kit.bench`, `kit.fence`.

## Objects at display scale (a computer, a radio, a coffee machine)
- The object stands on its own bottom or on a low **display stand** (a 2-plate base in a dark colour, edged with tiles).
- **Smooth fronts**: `kit.panel` for a screen or a smooth front face; `kit.sign` for a brand word or a model number.
- **Smooth top surfaces**: finish the visible top faces with tiles (`box(…, { top: 'tile' })` on the top course); studs on a product's top look unfinished.
- **Panel lines and details**: grille tiles (2412b) for vents and speakers, 1×1 round tiles (98138) for buttons and knobs, 1×2 jumper plates for
  centred single details, tiles in a contrasting colour for screens and labels.
- **Rounded edges**: curved slopes (11477, 15068, 61678, 93273) along top edges; 1×1 cheese slopes (54200) for small chamfers.
- **Depth**: step faces in and out by one stud (a recessed screen, a protruding drive bay) — flat faces read as boxes.

## Vehicles

A vehicle is not a building lying down. Buildings grow upward from a fixed footprint; vehicles grow *outward* from the wheels, and the
tyre envelope constrains everything that follows. Decide in this order, because each decision locks the next:

**width → wheels → axle stations → wheelbase and overhang → floor height → body → glazing → fascia.**

Width first, because it sets the whole scale: 4 studs is a town car, 6 is a display model with a real interior, 8 is a truck. `kit.vehicle`
builds 4-wide, and `kit.wheels` matches it. If the subject needs 6, you are writing the body yourself and the steps below still apply.

Then build from the inside out, and check the axle before trusting any of it:

1. **One axle, both wheels, nothing else.** `kit.wheels` gives you a wheel-pin plate with a mudguard and two tyres, and returns the height
   of the mudguard top — that number is the floor line for everything after it. Confirm the tyres touch the ground and the guards clear
   them before adding a single body part. A model whose stance is wrong cannot be saved by its paint.
2. **Join the axles with a narrow spine.** A plate or two down the centre, not a full-width floor: a floor that passes through the wheel
   space has to be cut around both arches, and that cut is where the model starts looking like a box with holes.
3. **Reserve both wheel wells.** However wide the body gets, the tyres keep their envelope. Build the arch as a supported curve (inverted
   slopes, `3659`/`3455` arches) rather than an implied one.
4. **Establish one continuous shoulder line.** Bonnet, doors and bed all meet at the same plate. A line that steps up and down between the
   front and rear of the same vehicle is the most common reason a build looks amateur.
5. **Fit the glazing and the interior before the roof.** Windscreen `3823` (2×4×2), steering wheel `3829c01`, seat `4079`. `kit.vehicle`
   returns `cabSeat` — a `{x, y, z, sit: true}` you can hand straight to `kit.minifig` — but check the driver's hands reach the wheel and
   their head clears the roof before you close it. Once the roof is on, an interior that does not fit is invisible and unfixable.
6. **Design both ends.** A front needs a face: paired headlights, a grille, a bumper with depth. A rear needs to be told apart from the
   front at a glance — different lamps, a different bumper, a plate recess. A vehicle with an identical front and back reads as a toy.
7. **Close the broad surfaces last.** Long tiles along the roof and sills, studs left only where something mounts. Studs on the roof of a
   car are the vehicle equivalent of a wall with nothing on it.

What to use, from our own catalogue:

| job | part |
|---|---|
| wheel holder plate (returns the floor line) | `4600`, via `kit.wheels` |
| rim / tyre / mudguard | `4624` / `3641` / `3788`, placed by `kit.wheels` |
| windscreen 2×4×2 | `3823` |
| steering wheel | `3829c01` |
| seat | `4079` |
| grille / vent | `2877`, `2412b` |
| headlights, tail lights | `4070` with a Trans tile, `6141` in Trans Red |

Dedicated parts first, bricks second. A brick-built substitute is fine when the real part does not exist at your scale or in your colour,
but say so in the brief — "there is no 3-wide mudguard, so the arch is stepped" is a decision; a stepped arch with no explanation is a
mistake.

The same order works for a tram, a bus or a truck. `sets/chikan-street` runs it for a 22-stud double-decker: the orange upper deck is an
open railing on a real deck plate, not a solid box with windows painted on.

## Interiors and furniture
- `kit.sofa`, `kit.chair`, `kit.table`, `kit.bookshelf`, `kit.rug`; seat figures with `kit.minifig({ sit: true, y: <seat level> })`.
- Show an interior by leaving the front open or by building only the back and one side wall (a "room box"), at minifig scale.
- Pets: the moulded animals (cat 11602 or 13786p03, dog 26078p01) on a stud of a rug, a sofa seat or the floor.

## Micro scale (cities, skylines)
- Windows are 1×1 tiles, grille tiles (2412b) or headlight bricks (4070) — not window frames. Stack setbacks on solid lids (`box(…, { hollow: true, top: 'plate' })`).
- Trees are 1×1 round plates or cones in green; people are left out. Bridges: arches (3659, 3455, 6108) on piers; water as tiles.
- Each landmark keeps its one signature shape (the Empire State's setbacks and needle, the Flatiron's wedge with 6564/6565 wedges).

## Minifigures
- `kit.minifig` with a printed torso and face (`kit.TORSOS`, `kit.FACES`, `kit.HAIR`). 1–3 per set, each doing something legible: at a door,
  tending flowers, walking a dog (26078p01), sitting at a café table (`sit: true` on a `kit.chair`), on a bench or a sofa. Face the front (rot 0) or side-on; leave 1 stud clear around them.

## Studs not on top (SNOT)
A side stud is a hinge: it lets a face be smooth where a brick would show studs, and lets a detail point sideways instead of up. The
checker verifies it — a tile's anti-stud must land exactly on the side stud — so use it where it earns its place, not everywhere.

**The four moves**
- **Smooth a wall.** `kit.panel` covers a wall in 2-stud-high tile panels; `kit.sign` spells a word; `kit.studCourse` gives you the whole
  course cell by cell (`cells(i)` → `[size, colour]`, or null to leave a stud bare). Bare studs between tiles read as a lattice or grille.
- **Project a course.** A row of plates on its side studs makes a cornice that stands one plate proud of the wall — the cheapest way to
  get a shadow line across a facade.
- **Turn a corner.** `4733` (1×1, four faces) is the universal junction; `26604` (two adjacent faces) joins two perpendicular runs without
  a gap. Use them at the end of every tile run, or the run stops dead.
- **Hang below.** A bracket (`99780`, `2436a`, `21731`) takes side studs off the top of a wall, so an eave, a hanging sign or a lamp can
  sit out over the street with nothing under it.

**Sizing** — side studs sit 1.75 plates above the brick's base, so a hung tile is centred mid-course, not flush with a plate line. Two
side studs of a 1×2 brick are 1 stud apart, which fits a 1×2 tile exactly. A 4733 gives four studs on four faces of one 1×1 cell: it
replaces a brick, and the wall must continue behind it (its side studs hold nothing of the wall).
`22885`/`32952`/`67329`/`7729` are 1⅔ bricks tall and carry two courses of side studs at once — use them where you want a 2-high panel
without a visible joint. `4595`/`4304`/`72132` are plate height: side studs between courses, for a thin tile band.

**Honest geometry** — mount a tile with its anti-stud cell on the stud. Half a stud off, it looks nearly right and fails the check; that
is the check doing its job. Don't reach for `m.rigid()` to silence it.
