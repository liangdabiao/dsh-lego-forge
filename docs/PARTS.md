# Parts

Every part here is a real LEGO part (LDraw id). Size is **x × z studs at rot 0, then height in plates** (3 plates = 1 brick).
"studs" = studs on top (what can be built on it); "side" = studs on its faces, which take a tile mounted sideways (SNOT — see docs/TECHNIQUES.md);
"no anti-studs" = it cannot sit on studs (it needs a clip or a bar — avoid unless a kit places it).
For slopes and curves, "faces +z" means the sloped face drops towards +z at rot 0; rot 1 turns that to +x, rot 2 to −z, rot 3 to −x.
Plain bricks, plates and tiles are easier through `m.brick(size, …)`, `m.plate(size, …)`, `m.tile(size, …)` and `m.box(…)`.
Where exactly a part has its studs and anti-studs: `node bin/lego.mjs part <id>` (a top view).

Sized helpers — bricks: 1x1, 1x2, 1x3, 1x4, 1x6, 1x8, 1x10, 1x12, 2x2, 2x3, 2x4, 2x6, 2x8, 2x10 · plates: 1x1, 1x2, 1x3, 1x4, 1x6, 1x8, 1x10, 1x12, 2x2, 2x3, 2x4, 2x6, 2x8, 2x10, 2x12, 4x4, 4x6, 4x8, 4x10, 4x12, 6x6, 6x8, 6x10, 6x12, 6x16, 8x8, 8x16, 16x16 · tiles: 1x1, 1x2, 1x3, 1x4, 1x6, 1x8, 2x2, 2x3, 2x4

## Bricks

| id | part | size | top | side | note |
|---|---|---|---|---|---|
| 2357 | Brick 2 x 2 Corner | 2×2 · 3p | 3 studs | 0 |  |
| 2434 | Brick 2 x 4 x 2 with Studs on Sides | 4×2 · 6p | 8 studs | 16 |  |
| 2456 | Brick 2 x 6 | 6×2 · 3p | 12 studs | 0 |  |
| 2462 | Brick 3 x 3 Facet | 3×3 · 3p | 3 studs | 0 |  |
| 2465 | Brick 1 x 16 | 16×1 · 3p | 16 studs | 0 |  |
| 2577 | Brick 4 x 4 Corner Round | 4×4 · 3p | 11 studs | 0 |  |
| 2877 | Brick 1 x 2 with Grille | 2×1 · 3p | 2 studs | 0 | grille brick: radiators, speakers, vents |
| 3001 | Brick 2 x 4 | 4×2 · 3p | 8 studs | 0 |  |
| 3002 | Brick 2 x 3 | 3×2 · 3p | 6 studs | 0 |  |
| 3003 | Brick 2 x 2 | 2×2 · 3p | 4 studs | 0 |  |
| 3004 | Brick 1 x 2 | 2×1 · 3p | 2 studs | 0 |  |
| 3005 | Brick 1 x 1 | 1×1 · 3p | 1 studs | 0 |  |
| 3006 | Brick 2 x 10 | 10×2 · 3p | 20 studs | 0 |  |
| 3007 | Brick 2 x 8 | 8×2 · 3p | 16 studs | 0 |  |
| 3008 | Brick 1 x 8 | 8×1 · 3p | 8 studs | 0 |  |
| 3009 | Brick 1 x 6 | 6×1 · 3p | 6 studs | 0 |  |
| 3010 | Brick 1 x 4 | 4×1 · 3p | 4 studs | 0 |  |
| 3065 | Brick 1 x 2 without Centre Stud | 2×1 · 3p | 2 studs | 0 |  |
| 3581 | Brick 1 x 1 x 2 with Shutter Holder | 1×1 · 6p | 1 studs · no anti-studs | 0 |  |
| 3622 | Brick 1 x 3 | 3×1 · 3p | 3 studs | 0 |  |
| 3941 | Brick 2 x 2 Round without Reinforcement | 2×2 · 3p | 4 studs | 0 | round 2×2 brick: columns, trunks, barrels |
| 4070 | Brick 1 x 1 with Headlight | 1×1 · 3p | 1 studs · no anti-studs | 1 | headlight brick |
| 4595 | Brick 1 x 2 x 0.667 with Studs on Sides | 1×3 · 2p | 2 studs | 5 | side studs at plate height |
| 4733 | Brick 1 x 1 with Studs on Four Sides | 1×1 · 3p | 1 studs | 4 | side stud on all four faces — the SNOT corner |
| 4735 | Brick 1 x 1 x 0.667 Round with Bar and Clip Vertical | 1×3 · 2.5p | 1 studs | 0 |  |
| 6111 | Brick 1 x 10 | 10×1 · 3p | 10 studs | 0 |  |
| 6112 | Brick 1 x 12 | 12×1 · 3p | 12 studs | 0 |  |
| 6143 | Brick 2 x 2 Round Reinforced | 2×2 · 3p | 4 studs | 0 |  |
| 6212 | Brick 4 x 10 | 10×4 · 3p | 40 studs | 0 |  |
| 6213 | Brick 2 x 6 x 3 | 6×2 · 9p | 12 studs | 0 |  |
| 7133 | Brick 1 x 2 with Centred Stud on Long Side without Bottom Stud Holder | 2×1 · 3p | 2 studs | 1 | one centred side stud |
| 7729 | Brick 1 x 1 x 1.667 with Studs on 3 Sides | 1×1 · 5p | 1 studs | 6 | side studs on three faces, 1×1×1⅔ |
| 11211 | Brick 1 x 2 with Two Studs on One Side | 2×1 · 3p | 2 studs | 2 | one side stud, 1×2 |
| 14716 | Brick 1 x 1 x 3 | 1×1 · 9p | 1 studs | 0 |  |
| 22885 | Brick 1 x 2 x 1.667 with Studs on 1 Side | 2×1 · 5p | 2 studs | 4 | side studs, 1⅔ bricks tall |
| 22886 | Brick 1 x 2 x 3 without Understud | 2×1 · 9p | 2 studs | 0 |  |
| 26604 | Brick 1 x 1 with Studs on Two Adjacent Sides | 1×1 · 3p | 1 studs | 2 | two adjacent side studs — an inside corner |
| 30136 | Brick 1 x 2 Log | 2×1 · 3p | 2 studs | 0 | log brick: cabins |
| 30145 | Brick 2 x 2 x 3 | 2×2 · 9p | 4 studs | 0 |  |
| 30414 | Brick 1 x 4 with Studs on Side | 4×1 · 3p | 4 studs | 4 | four side studs — SNOT |
| 32952 | Brick 1 x 1 x 1.667 with Studs on 1 Side | 1×1 · 5p | 1 studs | 2 | side studs, 1×1×1⅔ |
| 47905 | Brick 1 x 1 with Studs on Two Opposite Sides | 1×1 · 3p | 1 studs | 2 | two opposite side studs |
| 52107 | Brick 1 x 2 with Studs on Sides | 2×1 · 3p | 2 studs | 4 | side studs on both long faces |
| 67329 | Brick 1 x 2 x 1.667 with 8 Studs on 3 Sides | 2×1 · 5p | 2 studs | 8 | eight side studs on three faces |
| 85080 | Brick 2 x 2 Corner Round with Stud Notch and Reinforced Underside | 2×2 · 3p | 2 studs | 0 |  |
| 87081 | Brick 4 x 4 Round with Pinhole and Snapstud | 4×4 · 3p | 12 studs | 0 |  |
| 87087 | Brick 1 x 1 with Stud on 1 Side | 1×1 · 3p | 1 studs | 1 | one side stud — SNOT |
| 92947 | Brick 2 x 2 Round with Grille | 2×2 · 3p | 4 studs | 0 |  |
| 2453b | Brick 1 x 1 x 5 with Solid Stud | 1×1 · 15p | 1 studs | 0 |  |
| 3062b | Brick 1 x 1 Round with Hollow Stud | 1×1 · 3p | 1 studs | 0 | round 1×1 brick: posts, trunks, lamp posts |
| 3063b | Brick 2 x 2 Corner Round with Stud Notch | 2×2 · 3p | 2 studs | 0 |  |
| 3245c | Brick 1 x 2 x 2 without Understud | 2×1 · 6p | 2 studs | 0 |  |
| 3755a | Brick 1 x 3 x 5 without Inner Ridges | 3×1 · 15p | 3 studs | 0 |  |

## Plates

| id | part | size | top | side | note |
|---|---|---|---|---|---|
| 2420 | Plate 2 x 2 Corner | 2×2 · 1p | 3 studs | 0 |  |
| 2445 | Plate 2 x 12 | 12×2 · 1p | 24 studs | 0 |  |
| 2450 | Plate 3 x 3 without Corner | 3×3 · 1p | 6 studs | 0 |  |
| 2540 | Plate 1 x 2 with Handle | 2×2 · 1p | 2 studs · no anti-studs | 0 |  |
| 2926 | Plate 1 x 4 with 2 Wheel Pins | 5×1 · 1p | 4 studs · no anti-studs | 0 |  |
| 3020 | Plate 2 x 4 | 4×2 · 1p | 8 studs | 0 |  |
| 3021 | Plate 2 x 3 | 3×2 · 1p | 6 studs | 0 |  |
| 3022 | Plate 2 x 2 | 2×2 · 1p | 4 studs | 0 |  |
| 3024 | Plate 1 x 1 | 1×1 · 1p | 1 studs | 0 |  |
| 3027 | Plate 6 x 16 | 16×6 · 1p | 96 studs | 0 |  |
| 3028 | Plate 6 x 12 | 12×6 · 1p | 72 studs | 0 |  |
| 3029 | Plate 4 x 12 | 12×4 · 1p | 48 studs | 0 |  |
| 3030 | Plate 4 x 10 | 10×4 · 1p | 40 studs | 0 |  |
| 3031 | Plate 4 x 4 | 4×4 · 1p | 16 studs | 0 |  |
| 3032 | Plate 4 x 6 | 6×4 · 1p | 24 studs | 0 |  |
| 3033 | Plate 6 x 10 | 10×6 · 1p | 60 studs | 0 |  |
| 3034 | Plate 2 x 8 | 8×2 · 1p | 16 studs | 0 |  |
| 3035 | Plate 4 x 8 | 8×4 · 1p | 32 studs | 0 |  |
| 3036 | Plate 6 x 8 | 8×6 · 1p | 48 studs | 0 |  |
| 3176 | Plate 3 x 2 with Hole | 2×3 · 1p | 4 studs | 0 |  |
| 3460 | Plate 1 x 8 | 8×1 · 1p | 8 studs | 0 |  |
| 3623 | Plate 1 x 3 | 3×1 · 1p | 3 studs | 0 |  |
| 3666 | Plate 1 x 6 | 6×1 · 1p | 6 studs | 0 |  |
| 3710 | Plate 1 x 4 | 4×1 · 1p | 4 studs | 0 |  |
| 3795 | Plate 2 x 6 | 6×2 · 1p | 12 studs | 0 |  |
| 3832 | Plate 2 x 10 | 10×2 · 1p | 20 studs | 0 |  |
| 3958 | Plate 6 x 6 | 6×6 · 1p | 36 studs | 0 |  |
| 4304 | Plate 2 x 2 x 0.667 with Two Studs On Side and Two Raised with Partial Closed Understud | 2×2 · 2p | 4 studs | 2 | side studs at plate height, 2×2 |
| 4477 | Plate 1 x 10 | 10×1 · 1p | 10 studs | 0 |  |
| 4488 | Plate 2 x 2 with 1 Wheel Pin | 3×2 · 2p | 4 studs | 0 |  |
| 4600 | Plate 2 x 2 with 2 Wheel Pins | 3×2 · 1p | 4 studs · no anti-studs | 0 | wheel holder plate (wheels: see Vehicles) |
| 6019 | Plate 1 x 1 with Clip Horizontal (Thick U-Clip) | 1×2 · 1.75p | 1 studs · no anti-studs | 0 |  |
| 6141 | Plate 1 x 1 Round | 1×1 · 1p | 1 studs | 0 | round 1×1: lights, knobs, flower centres |
| 6157 | Plate 2 x 2 with 2 Wheel Pins Extended without Wishbones | 4×2 · 2p | 4 studs | 0 |  |
| 15573 | Plate 1 x 2 with Groove with 1 Centre Stud, without Understud | 2×1 · 1p | 1 studs | 0 | jumper: one centred stud — offsets the next part by half a stud |
| 18677 | Plate 1 x 2 with Offset Peghole on Underside | 2×1 · 2p | 2 studs · no anti-studs | 0 |  |
| 22888 | Plate 4 x 8 Round Semicircle | 8×4 · 1p | 22 studs | 0 |  |
| 24866 | Plate 1 x 1 with 5 Petals | 1×1 · 1p | 1 studs | 0 | flower 1×1 |
| 26047 | Plate 1 x 1 Round with Horizontal Handle on Side | 1×2 · 1p | 1 studs · no anti-studs | 0 |  |
| 30565 | Plate 4 x 4 with Corner Round | 4×4 · 1p | 11 studs | 0 |  |
| 32028 | Plate 1 x 2 with Door Rail | 2×1 · 1p | 2 studs · no anti-studs | 0 |  |
| 32607 | Plate 1 x 1 Round with 3 Leaves | 2×2 · 1p | 1 studs | 0 |  |
| 33291 | Plate 1 x 1 Round with Tabs | 1×1 · 1p | 1 studs | 0 |  |
| 35480 | Plate 1 x 2 with Round Ends and 2 Open Studs | 2×1 · 1p | 2 studs | 0 |  |
| 41539 | Plate 8 x 8 | 8×8 · 1p | 64 studs | 0 |  |
| 60478 | Plate 1 x 2 with Handle on End | 3×1 · 1p | 2 studs | 0 |  |
| 60479 | Plate 1 x 12 | 12×1 · 1p | 12 studs | 0 |  |
| 61252 | Plate 1 x 1 with Clip Horizontal (Thick C-Clip) | 1×2 · 1p | 1 studs · no anti-studs | 0 |  |
| 63868 | Plate 1 x 2 with Clip Horizontal on End (Thick C-Clip) | 3×1 · 1p | 2 studs · no anti-studs | 0 |  |
| 72132 | Plate 2 x 6 x 0.667 with Four Studs On Side and Four Raised Reinforced | 6×2 · 2p | 12 studs | 4 | side studs at plate height, 2×6 |
| 85861 | Plate 1 x 1 Round with Open Stud | 1×1 · 1p | 1 studs | 0 |  |
| 87580 | Plate 2 x 2 with Groove with 1 Centre Stud | 2×2 · 1p | 1 studs | 0 | jumper 2×2: one centred stud |
| 87609 | Plate 2 x 6 x 0.667 with Four Studs On Side and Four Raised | 6×2 · 2p | 12 studs | 4 | side studs at plate height, 2×6 |
| 91405 | Plate 16 x 16 with Underside Ribs | 16×16 · 1p | 256 studs | 0 | plate 16×16 |
| 92280 | Plate 1 x 2 with Single Clip on Top | 2×1 · 2.25p | 1 studs | 0 |  |
| 92438 | Plate 8 x 16 | 16×8 · 1p | 128 studs | 0 |  |
| 92593 | Plate 1 x 4 with Two Studs | 4×1 · 1p | 2 studs | 0 |  |
| 99206 | Plate 2 x 2 x 0.667 with Two Studs On Side and Two Raised with Closed Understud | 2×2 · 2p | 4 studs | 2 |  |
| 3023b | Plate 1 x 2 | 2×1 · 1p | 2 studs | 0 |  |
| 3794b | Plate 1 x 2 with Groove with 1 Centre Stud | 2×1 · 1p | 1 studs | 0 | jumper (older id) |
| 3839b | Plate 1 x 2 with Handles Type 2 | 3×2 · 1p | 2 studs · no anti-studs | 0 |  |
| 4032a | Plate 2 x 2 Round with Axlehole | 2×2 · 1p | 4 studs | 0 |  |
| 4081b | Plate 1 x 1 with Clip Light Type 2 | 1×2 · 1.75p | 1 studs | 2 |  |
| 4085c | Plate 1 x 1 with Clip Vertical (Thick U-Clip) | 1×2 · 1p | 1 studs · no anti-studs | 0 |  |
| 30157a | Plate 2 x 4 with Rounded Pins | 6×2 · 2p | 8 studs | 0 |  |

## Tiles (no studs on top)

| id | part | size | top | side | note |
|---|---|---|---|---|---|
| 1751 | Tile 4 x 4 | 4×4 · 1p | smooth | 0 |  |
| 2342 | Tile 1 x 2 with Console | 1×2 · 5.78p | 1 studs | 2 |  |
| 2431 | Tile 1 x 4 with Groove | 4×1 · 1p | smooth | 0 |  |
| 2555 | Tile 1 x 1 with Clip | 1×1 · 2.25p | smooth | 0 |  |
| 3396 | Tile 2 x 2 with Two 1 x 1 Curved Cutouts | 2×2 · 1p | smooth | 0 |  |
| 4150 | Tile 2 x 2 Round with Cross Underside Stud | 2×2 · 1p | smooth | 0 |  |
| 4162 | Tile 1 x 8 | 8×1 · 1p | smooth | 0 |  |
| 6636 | Tile 1 x 6 | 6×1 · 1p | smooth | 0 |  |
| 14769 | Tile 2 x 2 Round with Round Underside Stud | 2×2 · 1p | smooth | 0 |  |
| 15535 | Tile 2 x 2 Round with Hole | 2×2 · 1p | smooth | 0 |  |
| 15712 | Tile 1 x 1 with Clip (Thick C-Clip) | 1×1 · 2.25p | smooth | 0 |  |
| 24246 | Tile 1 x 1 with Rounded End | 1×1 · 1p | smooth | 0 |  |
| 25269 | Tile 1 x 1 Corner Round | 1×1 · 1p | smooth | 0 |  |
| 26603 | Tile 2 x 3 | 3×2 · 1p | smooth | 0 |  |
| 27925 | Tile 2 x 2 Corner Round | 2×2 · 1p | smooth | 0 |  |
| 35381 | Tile 1 x 1 Round with Groove | 1×1 · 1p | smooth | 0 |  |
| 63864 | Tile 1 x 3 | 3×1 · 1p | smooth | 0 |  |
| 87079 | Tile 2 x 4 | 4×2 · 1p | smooth | 0 |  |
| 98138 | Tile 1 x 1 Round with Groove | 1×1 · 1p | smooth | 0 | round tile: dials, plates on tables, eyes |
| 2412b | Tile 1 x 2 Grille with Groove | 2×1 · 1p | smooth | 0 | grille tile: vents, fronts, drains |
| 3068b | Tile 2 x 2 with Groove | 2×2 · 1p | smooth | 0 |  |
| 3068bp06 | Tile 2 x 2 with Red Warning Triangle Pattern | 2×2 · 1p | smooth | 0 |  |
| 3069b | Tile 1 x 2 with Groove | 2×1 · 1p | smooth | 0 |  |
| 3069bp01 | Tile 1 x 2 with Letter Pattern | 2×1 · 1p | smooth | 0 |  |
| 3070b | Tile 1 x 1 with Groove | 1×1 · 1p | smooth | 0 | tile: smooth finish |
| 3070bp01 | Tile 1 x 1 with Black "1" Pattern | 1×1 · 1p | smooth | 0 |  |

## Slopes and wedges

| id | part | size | top | side | note |
|---|---|---|---|---|---|
| 2449 | Slope Brick 75 2 x 1 x 3 Inverted | 1×1 · 9p | 2 studs · no anti-studs | 2 |  |
| 3037 | Slope Brick 45 2 x 4 | 4×2 · 3p | 4 studs | 0 | faces +z |
| 3038 | Slope Brick 45 2 x 3 | 3×2 · 3p | 3 studs | 0 | faces +z |
| 3039 | Slope Brick 45 2 x 2 | 2×2 · 3p | 2 studs | 0 | faces +z · the classic roof slope |
| 3041 | Slope Brick 45 2 x 4 Double | 4×2 · 3p | smooth | 0 |  |
| 3042 | Slope Brick 45 2 x 3 Double | 3×2 · 3p | smooth | 0 |  |
| 3043 | Slope Brick 45 2 x 2 Double | 2×2 · 3p | smooth | 0 | roof ridge (two faces) |
| 3045 | Slope Brick 45 2 x 2 Double Convex | 2×2 · 3p | 1 studs | 0 | faces +z · hip-roof outer corner |
| 3046 | Slope Brick 45 2 x 2 Double Concave | 2×2 · 3p | 3 studs | 0 | faces +z · hip-roof inner corner |
| 3297 | Slope Brick 33 3 x 4 | 4×3 · 3p | 4 studs | 0 | faces +z |
| 3298 | Slope Brick 33 3 x 2 | 2×3 · 3p | 2 studs | 0 | faces +z |
| 3299 | Slope Brick 33 2 x 4 Double | 4×2 · 1.75p | smooth | 0 |  |
| 3676 | Slope Brick 45 2 x 2 Inverted Double Convex | 2×2 · 3p | 4 studs | 0 |  |
| 4161 | Slope Brick 33 3 x 3 | 3×3 · 3p | 3 studs | 0 | faces +z |
| 4286 | Slope Brick 33 3 x 1 | 1×3 · 3p | 1 studs | 0 | faces +z |
| 6564 | Wedge 3 x 2 Right | 2×3 · 3p | 3 studs | 0 |  |
| 6565 | Wedge 3 x 2 Left | 2×3 · 3p | 3 studs | 0 |  |
| 30363 | Slope Brick 18 4 x 2 | 2×4 · 3p | 2 studs | 0 | faces +z |
| 54200 | Slope Brick 31 1 x 1 x 0.667 | 1×1 · 1.95p | smooth | 0 | "cheese" slope: tiny details, roof textures |
| 60477 | Slope Brick 18 4 x 1 | 1×4 · 3p | 1 studs | 0 | faces +z |
| 85984 | Slope Brick 31 1 x 2 x 0.667 | 2×1 · 1.95p | smooth | 0 | low 1×2 slope: dashboards, roofs, keyboards |
| 87619 | Wedge 4 x 6 x 1.667 Inverted with Studs on Front Side | 6×4 · 5p | 12 studs | 4 | inverted wedge with side studs |
| 92946 | Slope Plate 45.73 2 x 1 | 1×2 · 3p | 1 studs | 0 | faces −z |
| 99301 | Slope Brick 33 3 x 3 Double Concave | 3×3 · 3p | 5 studs | 0 | faces +z |
| 3040b | Slope Brick 45 2 x 1 | 1×2 · 3p | 1 studs | 0 | faces +z · roof slope, 1 wide |
| 3044b | Slope Brick 45 2 x 1 Double | 1×2 · 3p | smooth | 0 | roof ridge, 1 wide |
| 3048b | Slope Brick 45 1 x 2 Triple | 2×1 · 3p | smooth | 0 |  |
| 3665a | Slope Brick 45 2 x 1 Inverted without Inner Stopper Ring | 1×2 · 3p | 3 studs | 0 | inverted: overhangs, eaves, undersides |
| 3747a | Slope Brick 33 3 x 2 Inverted without Ribs between Studs | 2×3 · 3p | 6 studs | 0 |  |
| 4287a | Slope Brick 33 3 x 1 Inverted with Notch and Thick Front | 1×3 · 3p | 5 studs | 0 |  |
| 4460a | Slope Brick 75 2 x 1 x 3 with Open Stud | 1×2 · 9p | 1 studs | 0 | faces +z |
| 60481a | Slope Brick 65 2 x 1 x 2 with Symmetric Stud Holder | 1×2 · 6p | 1 studs | 0 | faces +z |

## Curved slopes and curved arches

| id | part | size | top | side | note |
|---|---|---|---|---|---|
| 6005 | Arch 1 x 3 x 2 with Curved Top | 1×3 · 6p | 1 studs | 0 | faces +z |
| 6091 | Brick 2 x 1 x 1.333 with Curved Top | 1×2 · 4p | 1 studs | 0 | curved top 1×2: fenders, rounded tops |
| 6183 | Arch 1 x 6 x 2 with Curved Top | 6×1 · 6p | 2 studs | 0 |  |
| 11290 | Slope Brick Curved 2 x 8 x 2 Double | 8×2 · 6p | 4 studs | 0 |  |
| 11477 | Slope Brick Curved 2 x 1 | 1×2 · 2p | smooth | 0 | faces +z · curved 2×1: small smooth edges |
| 15068 | Slope Brick Curved 2 x 2 x 0.667 | 2×2 · 2p | smooth | 0 | faces +z · curved 2×2: smooth roofs, car bonnets |
| 24201 | Slope Brick Curved 2 x 1 Inverted | 1×2 · 1.99p | 6 studs · no anti-studs | 0 | faces −z |
| 24309 | Slope Brick Curved 3 x 2 | 2×3 · 3p | smooth | 0 | faces +z · curved 3×2 |
| 30602 | Slope Brick Curved Top 2 x 2 x 1 | 2×2 · 3p | smooth · no anti-studs | 0 | faces +z |
| 37352 | Brick 1 x 2 with Curved Top | 2×1 · 3p | smooth | 0 |  |
| 50950 | Slope Brick Curved 3 x 1 | 1×3 · 3p | smooth | 0 | faces +z · curved 3×1 |
| 61678 | Slope Brick Curved 4 x 1 | 1×4 · 3p | smooth | 0 | faces +z · curved 4×1: streamlined edges |
| 79897 | Slope Brick Curved 2 x 4 x 0.667 with Fin and 4 Studs and 2 Hollow Studs on Sides | 2×4 · 5p | 4 studs · no anti-studs | 4 | faces +z · curved 2×4 with side studs |
| 88930 | Slope Brick Curved 2 x 4 with Underside Studs | 4×2 · 2p | smooth | 0 | faces +z · curved 2×4 with studs underneath |
| 92903 | Arch 1 x 3 x 2 with Curved Top | 1×3 · 6p | 1 studs | 0 | faces +z |
| 93273 | Slope Brick Curved 4 x 1 Double | 1×4 · 2p | smooth | 0 | curved 4×1 double |
| 93604 | Slope Brick Curved 3 x 4 x 0.667 Rounded | 4×3 · 2p | 2 studs | 0 | faces −z |
| 93606 | Slope Brick Curved 4 x 2 | 2×4 · 3p | smooth | 0 | faces +z |
| 98281 | Wedge 6 x 4 x 0.667 Quadruple Curved | 4×6 · 2p | 4 studs | 0 |  |

## Cones, domes, dishes

| id | part | size | top | side | note |
|---|---|---|---|---|---|
| 3960 | Dish 4 x 4 Inverted | 4×4 · 2p | 1 studs | 0 | dish 4×4 |
| 4589 | Cone 1 x 1 | 1×1 · 3p | 1 studs | 0 | cone 1×1: tips, lamp tops |
| 4740 | Dish 2 x 2 Inverted | 2×2 · 1p | 1 studs | 0 | dish 2×2: satellite dishes, lamp shades |
| 6233 | Cone 3 x 3 x 2 | 3×3 · 6p | 4 studs | 0 |  |
| 15395 | Dome 2 x 2 Inverted with Stud and Tube | 2×2 · 3.5p | 1 studs | 0 |  |
| 59900 | Cone 1 x 1 with Stop | 1×1 · 3p | 1 studs | 0 |  |
| 98100 | Cone 2 x 2 Truncated | 2×2 · 3p | 1 studs | 0 |  |
| 2654a | Dish 2 x 2 with Rim | 2×2 · 1p | 4 studs · no anti-studs | 0 |  |
| 3942b | Cone 2 x 2 x 2 with Hollow Stud and Axlehole Teeth | 2×2 · 6p | 1 studs | 0 | cone 2×2×2 |
| 3943b | Cone 4 x 4 x 2 with Axlehole | 4×4 · 6p | 4 studs | 0 |  |
| 30361a | Cylinder 2 x 2 x 2 Robot Body without Bottom Axle Holder | 2×2 · 6p | 4 studs | 0 |  |

## Arches

| id | part | size | top | side | note |
|---|---|---|---|---|---|
| 2339 | Arch 1 x 5 x 4 | 1×5 · 12p | 5 studs | 0 |  |
| 3307 | Arch 1 x 6 x 2 with Thick Top and Reinforced Underside | 6×1 · 6p | 6 studs | 0 |  |
| 3455 | Arch 1 x 6 | 6×1 · 3p | 6 studs | 0 | arch 1×6 |
| 3659 | Arch 1 x 4 | 4×1 · 3p | 4 studs | 0 | arch 1×4 |
| 4490 | Arch 1 x 3 | 3×1 · 3p | 3 studs | 0 |  |
| 6108 | Arch 1 x 12 x 3 | 12×1 · 9p | 12 studs | 0 | arch 1×12×3 (bridges) |
| 6182 | Arch 1 x 4 x 2 | 4×1 · 6p | 4 studs | 0 | arch 1×4×2 |
| 13965 | Arch 1 x 3 x 3 Pointed | 1×3 · 9p | 3 studs | 0 |  |
| 14707 | Arch 1 x 12 x 3 Raised | 12×1 · 9p | 12 studs | 0 |  |
| 15254 | Arch 1 x 6 x 2 with Thin Top | 6×1 · 6p | 6 studs | 0 |  |
| 18653 | Arch 1 x 3 x 2 Inverted | 3×1 · 6p | 1 studs | 0 |  |
| 30099 | Arch 1 x 5 x 4 Inverted | 5×1 · 12p | 2 studs | 0 |  |

## Windows, doors, panels, fences

| id | part | size | top | side | note |
|---|---|---|---|---|---|
| 2529 | Window 1 x 2 x 3 Pane Latticed | 1×2 · 7.75p | smooth · no anti-studs | 0 |  |
| 3582 | Window 1 x 2 x 2 Shutter | 1×2 · 6p | smooth · no anti-studs | 0 |  |
| 3633 | Fence Lattice 1 x 4 x 1 | 4×1 · 3p | smooth | 0 | lattice fence 1×4 |
| 3644 | Door 1 x 4 x 6 Grooved | 1×4 · 17p | smooth · no anti-studs | 0 |  |
| 3821 | Door 1 x 3 x 1 Right | 1×3 · 3p | 1 studs · no anti-studs | 0 |  |
| 3822 | Door 1 x 3 x 1 Left | 1×3 · 3p | 1 studs · no anti-studs | 0 |  |
| 3853 | Window 1 x 4 x 3 | 4×1 · 9p | 2 studs · no anti-studs | 0 |  |
| 3854 | Window 1 x 2 x 3 Pane | 1×2 · 7.75p | smooth · no anti-studs | 0 |  |
| 23969 | Panel 1 x 2 x 1 Double Corner with Rounded Corners | 2×1 · 3p | smooth | 0 |  |
| 30044 | Window 1 x 2 x 2.667 with Rounded Top | 2×1 · 8p | 1 studs | 0 |  |
| 30046 | Window 1 x 2 x 2.667 Pane Lattice Diamond with Rounded Top | 2×1 · 6.59p | smooth · no anti-studs | 0 |  |
| 30055 | Fence Spindled 1 x 4 x 2 | 4×1 · 6p | 2 studs | 0 | spindled fence 1×4×2 |
| 30156 | Panel 4 x 6 x 6 Sloped | 6×4 · 18p | 6 studs | 0 |  |
| 30179 | Door 1 x 4 x 6 Frame Type 1 | 4×1 · 18p | 4 studs | 0 | door frame 1×4×6 (use kit.door) |
| 40241 | Door 1 x 4 x 6 with Window | 5×1 · 16.93p | smooth · no anti-studs | 0 |  |
| 60592 | Window 1 x 2 x 2 without Sill | 2×1 · 6p | 2 studs | 0 | window frame 1×2×2 (use kit.window) |
| 60593 | Window 1 x 2 x 3 without Sill | 2×1 · 9p | 2 studs | 0 | window frame 1×2×3 (use kit.window) |
| 60594 | Window 1 x 4 x 3 without Shutter Tabs | 4×1 · 9p | 2 studs | 0 | window frame 1×4×3 (use kit.window) |
| 60596 | Door 1 x 4 x 6 Frame | 4×1 · 18p | 2 studs | 0 |  |
| 60621 | Door 1 x 4 x 6 Barred | 4×1 · 16.81p | smooth · no anti-studs | 2 |  |
| 87544 | Panel 1 x 2 x 3 Reinforced | 2×1 · 9p | 2 studs | 0 | panel 1×2×3 |
| 87552 | Panel 1 x 2 x 2 Reinforced | 2×1 · 6p | 2 studs | 0 | panel 1×2×2 |
| 2493b | Window 1 x 4 x 5 with Hollow Studs | 4×1 · 15p | 4 studs | 0 |  |
| 3861c | Door 1 x 4 x 5 with 4 Panes and Reinforced Hinge | 1×4 · 15p | 1 studs | 0 |  |
| 4865a | Panel 1 x 2 x 1 with Square Corners | 2×1 · 3p | smooth | 0 | panel 1×2×1: low walls, counters |

## Details (bars, brackets, hinges, wings…)

| id | part | size | top | side | note |
|---|---|---|---|---|---|
| 2422 | Bracket 2 x 2 - 1 x 4 | 2×2 · 11p | 4 studs | 4 | bracket 2×2-1×4 |
| 2489 | Barrel 2 x 2 x 1.667 | 2×2 · 5.5p | smooth | 0 |  |
| 2569 | Antenna 8H Whip | 1×1 · 24p | smooth | 0 |  |
| 3700 | Technic Brick 1 x 2 with Hole | 2×1 · 3p | 2 studs | 0 |  |
| 3701 | Technic Brick 1 x 4 with Holes | 4×1 · 3p | 4 studs | 0 |  |
| 3823 | Windscreen 2 x 4 x 2 | 4×2 · 6p | 2 studs | 0 |  |
| 3937 | Hinge 1 x 2 Base | 2×1 · 2.75p | smooth | 0 |  |
| 3938 | Hinge 1 x 2 Top | 2×1 · 2p | 2 studs · no anti-studs | 0 |  |
| 4083 | Bar 1 x 4 x 2 with Studs | 4×1 · 6p | 2 studs | 0 |  |
| 4214 | Hinge Car Roof Holder 1 x 4 x 2 | 4×1 · 7p | smooth | 0 |  |
| 4274 | Technic Pin 1/2 | 1×1 · 2p | smooth · no anti-studs | 1 |  |
| 4346 | Container Box 2 x 2 x 2 Door with Slot | 2×1 · 6p | smooth · no anti-studs | 0 |  |
| 4594 | Windscreen 2 x 4 x 2 Vertical | 4×2 · 6p | 6 studs | 0 |  |
| 4598 | Bracket 2 x 3 - 2 x 2 | 2×3 · 6p | 5 studs | 0 |  |
| 6020 | Bar 7 x 3 with Double Clips | 3×7 · 2p | smooth · no anti-studs | 0 |  |
| 6134 | Hinge 2 x 2 Top | 2×2 · 2p | 4 studs · no anti-studs | 0 |  |
| 6187 | Bar 1 x 4 x 2 | 4×1 · 6p | smooth | 0 |  |
| 6556 | Train Window 1 x 4 x 3 with Shutter Holes | 4×1 · 9p | 2 studs | 0 |  |
| 10201 | Bracket 1 x 2 - 1 x 4 with Rounded Corners | 4×1 · 3p | 2 studs · no anti-studs | 4 |  |
| 14520 | Bracket 2 x 4 x 0.667 with Front Studs and Deep Arches | 4×1 · 5p | 2 studs | 6 | bracket 2×4 with deep arches |
| 18986 | Bracket 1 x 1 - 1 x 2 | 2×1 · 2.87p | smooth | 2 | bracket 1×1-1×2 |
| 21731 | Bracket 1 x 2 - 2 x 4 | 4×1 · 5p | 2 studs | 8 | bracket 1×2-2×4 |
| 24375 | Technic Rubber Pin for Chain Tread 5 Wide | 1×1 · 1.75p | smooth · no anti-studs | 0 |  |
| 28802 | Bracket 1 x 2 - 1 x 4 with Rounded Bottom Corners | 4×1 · 3p | 2 studs · no anti-studs | 4 |  |
| 30153 | Rock 1 x 1 Gem Facetted | 1×1 · 2.75p | smooth · no anti-studs | 0 |  |
| 30209 | Bracket 1 x 2 - Dish 4 x 4 | 4×2 · 10.5p | 2 studs · no anti-studs | 12 | bracket with a 4×4 dish |
| 30374 | Bar 4L Lightsaber Blade | 1×1 · 10p | smooth · no anti-studs | 0 |  |
| 32001 | Technic Plate 2 x 6 with Holes | 6×2 · 1p | 12 studs | 0 |  |
| 32530 | Technic Tile 1 x 2 with Two Holes | 2×1 · 4.88p | smooth | 0 |  |
| 35262 | Bracket 2 x 2 - 2 x 2 Up | 2×2 · 6p | smooth | 4 | bracket 2×2-2×2↑ |
| 36840 | Bracket 1 x 1 - 1 x 1 Up | 1×1 · 2.5p | 1 studs | 1 | bracket 1×1↑ |
| 36841 | Bracket 1 x 1 - 1 x 1 Down | 1×1 · 3p | 1 studs · no anti-studs | 1 | bracket 1×1↓ |
| 87994 | Bar 3L | 1×1 · 7.5p | smooth · no anti-studs | 0 |  |
| 99207 | Bracket 1 x 2 - 2 x 2 Up | 2×1 · 5p | 2 studs | 4 |  |
| 99780 | Bracket 1 x 2 - 1 x 2 Up | 2×1 · 2.5p | 2 studs | 2 | bracket 1×2↑ — hangs SNOT off a wall top |
| 99781 | Bracket 1 x 2 - 1 x 2 Down | 2×1 · 3p | 2 studs · no anti-studs | 2 | bracket 1×2↓ |
| 2436a | Bracket 1 x 2 - 1 x 4 with Square Corners | 4×1 · 3p | 2 studs · no anti-studs | 4 | bracket 1×2-1×4 — long arm out over a street |
| 2436b | Bracket 1 x 2 - 1 x 4 with Rounded Corners | 4×1 · 3p | 2 studs · no anti-studs | 4 | bracket 1×2-1×4, rounded corners |
| 3957a | Antenna 4H with Rounded Top | 1×1 · 12p | smooth | 0 |  |
| 4345b | Container Box 2 x 2 x 2 with Hollow Studs | 2×2 · 6p | 4 studs | 0 |  |
| 4346p01 | Container Box 2 x 2 x 2 Door with Fire Logo Red/Orange/Yellow Pattern | 2×1 · 6p | smooth · no anti-studs | 0 |  |
| 4495a | Flag 4 x 1 with First Wave Left | 1×4 · 3p | 1 studs | 0 |  |
| 4599a | Tap 1 x 1 with Hole in Spout | 1×1 · 3p | 1 studs | 0 |  |
| 32064a | Technic Brick 1 x 2 with Axlehole with Open Sides and Stud Blocker | 2×1 · 3p | 2 studs | 0 |  |
| 41769a | Wing 2 x 4 Right without Chamfer | 2×4 · 1p | 4 studs | 0 |  |
| 41770a | Wing 2 x 4 Left without Chamfer | 2×4 · 1p | 4 studs | 0 |  |
| 43722a | Wing 2 x 3 Right without Chamfer | 2×3 · 1p | 3 studs | 0 |  |
| 43723a | Wing 2 x 3 Left without Chamfer | 2×3 · 1p | 3 studs | 0 |  |
| 48729a | Bar 1.5L with Clip without Hole in Shaft | 1×1 · 4.79p | smooth · no anti-studs | 0 |  |

## Plants

| id | part | size | top | side | note |
|---|---|---|---|---|---|
| 2417 | Plant Leaves 6 x 5 | 5×6 · 1p | 14 studs | 0 | leaves 6×5: tree canopies (see kit.tree) |
| 2423 | Plant Leaves 4 x 3 | 3×4 · 1p | 6 studs | 0 | leaves 4×3 (no anti-studs: rides on a clip — avoid) |
| 2435 | Plant Tree Pyramidal 3 x 3 x 4 | 3×3 · 12.38p | smooth | 0 | small moulded pine |
| 3471 | Plant Tree Pyramidal 4 x 4 x 6.667 Type 1 | 4×4 · 19.88p | smooth | 0 | moulded pine tree |
| 3742 | Plant Flower | 1×1 · 0.75p | smooth · no anti-studs | 0 |  |
| 6148 | Plant Palm Leaf Small | 8×3 · 4p | 2 studs · no anti-studs | 0 |  |
| 6255 | Plant 1 x 1 x 0.667 Round with 3 Large Leaves | 5×4 · 5.43p | 1 studs · no anti-studs | 0 |  |
| 15279 | Plant Grass Stem | 1×2 · 8p | smooth | 0 |  |
| 19119 | Plant Flower Stem with Bar and 6 Stems | 2×3 · 5.35p | smooth · no anti-studs | 0 |  |
| 24855 | Plant Flower Stem with Bar and Hole | 2×2 · 5.94p | smooth | 0 |  |
| 30176 | Plant Brick 1 x 1 Round with 3 Bamboo Leaves | 3×4 · 3p | 1 studs · no anti-studs | 0 |  |
| 37695 | Plant Stem with 3 Leaves with Bar and Pin Holes | 2×2 · 3.96p | smooth | 0 |  |
| 98262 | Plant Flower 2 x 2 with Solid Stud | 2×2 · 3p | 1 studs | 0 | flower 2×2 |
| 3741a | Plant Flower Stem | 2×1 · 5.14p | 1 studs · no anti-studs | 0 |  |
| 6064b | Plant Bush | 4×4 · 13p | 1 studs | 0 | bush |

## Animals

| id | part | size | top | side | note |
|---|---|---|---|---|---|
| 2546 | Animal Bird Parrot | 1×1 · 9.22p | smooth · no anti-studs | 0 |  |
| 6251 | Animal Cat Crouching | 1×2 · 4.59p | smooth | 0 |  |
| 11602 | Animal Cat Sitting | 2×2 · 6.71p | smooth | 0 |  |
| 13665 | Animal Bird Crow | 3×2 · 3.17p | smooth | 0 |  |
| 30238 | Animal Spider | 3×2 · 2p | smooth | 0 |  |
| 33122 | Animal Starfish | 3×2 · 2p | 1 studs | 0 |  |
| 33320 | Animal Frog | 1×1 · 2.83p | smooth | 0 |  |
| 64648 | Animal Fish Straight | 1×3 · 3.19p | smooth | 1 |  |
| 2546p01 | Animal Bird Parrot with White Face and Yellow/Green Wings Pattern | 1×1 · 9.22p | smooth · no anti-studs | 0 |  |
| 2889p01 | Animal Dog Alsatian / German Shepherd Puppy with Black Eyes and Nose and Dark Brown Muzzle Pattern | 1×2 · 5.57p | smooth | 0 |  |
| 6251p01 | Animal Cat Crouching with Medium Blue Eyes, Black Pupils, Eyelashes and Nose Pattern | 1×2 · 4.59p | smooth | 0 |  |
| 11602p01 | Animal Cat Sitting with Medium Azure Eyes and Collar with Bright Pink Heart Tag, Black Nose and Light Bluish Grey Patches Pattern | 2×2 · 6.71p | smooth | 0 |  |
| 12888p01 | Animal Dog Chihuahua with Face Pattern | 1×1 · 4.92p | smooth | 0 |  |
| 12891p01 | Animal Bird Seagull with Bright Light Orange Beak and Black and Light Bluish Grey Wings Pattern | 3×3 · 5.78p | smooth | 0 |  |
| 13786p01 | Animal Cat Standing Looking Forward with White Chest and Muzzle and Bright Pink Nose Pattern | 1×2 · 7.67p | smooth | 0 |  |
| 13786p03 | Animal Cat Standing Looking Forward with Yellow Eyes and Dark Bluish Grey Nose and Mouth Pattern | 1×2 · 7.67p | smooth | 0 |  |
| 26078p01 | Animal Dog Terrier with Black Eyes and Nose and Light Bluish Grey Fur Lines Pattern | 1×3 · 6.78p | smooth | 0 |  |
| 29602p01 | Animal Dog French Bulldog with White Spot on Forehead and Black Face Pattern | 1×3 · 5.89p | smooth | 0 |  |
| 53075p01 | Animal Dog Dachshund with Black Eyes and Nose Pattern | 1×4 · 5.4p | 1 studs | 0 |  |
| 92586p01 | Animal Dog German Shepherd with Black Eyes, Nose, Blaze and Dark Brown Muzzle Pattern | 1×4 · 8.96p | 1 studs | 0 |  |
| 93089p01 | Animal Cat Standing Looking Left with Yellowish Green Eyes and Dark Bluish Grey Stripes Pattern | 1×3 · 6.01p | smooth | 0 |  |

## Vehicles

| id | part | size | top | side | note |
|---|---|---|---|---|---|
| 2441 | Car Base 7 x 4 x 0.667 | 4×7 · 2p | 20 studs | 0 | car base 7×4 |
| 3641 | Tyre 6/ 50 x 8 Offset Tread | 2×1 · 4.5p | smooth · no anti-studs | 0 |  |
| 3788 | Car Mudguard 2 x 4 | 4×2 · 2p | 8 studs | 0 |  |
| 4211 | Car Base 4 x 5 | 4×5 · 2p | 16 studs | 0 | car base 4×5 |
| 4624 | Wheel Rim 6.4 x 8 | 1×1 · 2.5p | smooth · no anti-studs | 0 |  |
| 6015 | Tyre 12/ 40 x 11 Wide | 2×1 · 6.25p | smooth · no anti-studs | 0 |  |
| 50944 | Wheel Rim 6.4 x 11 with 5 Spokes | 1×1 · 3.5p | smooth · no anti-studs | 0 |  |
| 50947 | Car Mudguard 4.5 x 1 x 1 | 4×1 · 2.38p | smooth | 0 |  |
| 50951 | Tyre 6/ 30 x 11 | 2×1 · 4.75p | smooth · no anti-studs | 0 |  |
| 55981 | Wheel Rim 14 x 18 with Holes on Both Sides (Needs Work) | 2×2 · 5.25p | smooth · no anti-studs | 0 |  |
| 56891 | Tyre 18/ 56 x 17 Off-Road with Offset Centre | 5×2 · 11.5p | smooth · no anti-studs | 0 |  |
| 92851 | Wheel Minifig Bicycle with Integral Rubber Black Tyre | 2×1 · 5.3p | smooth · no anti-studs | 0 |  |
| 3829c01 | Car Steering Stand and Wheel (Complete) | 2×1 · 5.84p | smooth | 0 | steering wheel on stand |
| 6014a | Wheel Rim 12 x 11 with Round Hole | 1×1 · 3.25p | smooth · no anti-studs | 0 |  |
| 30027b | Wheel Rim 8 x 8 Notched Hole, Two Slots, for Wheel Holding Pin | 1×1 · 2.5p | smooth · no anti-studs | 0 |  |
| 30028b | Tyre 8/ 40 x 8 Slick Smooth | 2×1 · 4.5p | smooth · no anti-studs | 0 |  |

## Minifigure hats, hair and accessories

| id | part | size | top | side | note |
|---|---|---|---|---|---|
| 3624 | Minifig Police Hat | 2×2 · 1.98p | smooth · no anti-studs | 0 |  |
| 3625 | Minifig Hair Female with Pigtails | 2×1 · 3.53p | smooth | 0 |  |
| 3629 | Minifig Hat Cowboy | 2×2 · 2.5p | smooth · no anti-studs | 0 |  |
| 3833 | Minifig Construction Helmet | 2×2 · 2.13p | smooth · no anti-studs | 0 |  |
| 3834 | Minifig Fire Helmet | 2×2 · 3.25p | smooth · no anti-studs | 0 |  |
| 3836 | Minifig Pushbroom | 2×1 · 10.6p | smooth · no anti-studs | 0 |  |
| 3837 | Minifig Shovel | 1×1 · 11.5p | smooth · no anti-studs | 0 |  |
| 3846 | Minifig Shield Triangular | 2×1 · 5.8p | smooth · no anti-studs | 0 |  |
| 3878 | Minifig Top Hat | 2×2 · 2.63p | smooth · no anti-studs | 0 |  |
| 3896 | Minifig Helmet Castle with Chin-Guard | 2×2 · 5.12p | smooth · no anti-studs | 0 |  |
| 3899 | Minifig Cup | 1×2 · 3p | smooth | 0 |  |
| 3900 | Minifig Signal Holder | 1×3 · 1p | 1 studs · no anti-studs | 0 |  |
| 3901 | Minifig Hair Male | 1×1 · 3.01p | smooth | 0 |  |
| 4006 | Minifig Tool Spanner/Screwdriver | 1×1 · 9.05p | smooth · no anti-studs | 0 |  |
| 4079 | Minifig Seat 2 x 2 | 2×2 · 6p | 2 studs | 0 |  |
| 4497 | Minifig Spear with Round End | 1×1 · 18.25p | smooth · no anti-studs | 0 |  |
| 4523 | Minifig Container D-Basket | 2×2 · 4p | smooth | 0 |  |
| 4528 | Minifig Frypan | 1×2 · 1.5p | smooth | 0 |  |
| 4529 | Minifig Saucepan | 1×2 · 3p | smooth | 0 |  |
| 4530 | Minifig Hair Shoulder Length | 2×1 · 3.71p | smooth · no anti-studs | 0 |  |
| 6131 | Minifig Wizards Hat | 3×3 · 4.86p | smooth | 0 |  |
| 6246 | Minifig Tool Mechanical, 6 on Sprue | 8×8 · 2.38p | smooth · no anti-studs | 0 |  |
| 10048 | Minifig Hair Tousled | 2×2 · 4.13p | smooth | 0 |  |
| 13785 | Minifig Hair with Ponytail and Fringe | 1×2 · 4.11p | smooth · no anti-studs | 0 |  |
| 15443 | Minifig Hair with 2 Locks on Left Side | 2×2 · 3.49p | smooth · no anti-studs | 0 |  |
| 20877 | Minifig Hair Female Short Swept Sideways | 2×2 · 4.04p | smooth · no anti-studs | 0 |  |
| 26139 | Minifig Hair Short Wavy with Centre Parting | 2×2 · 4.11p | smooth · no anti-studs | 0 |  |
| 30148 | Minifig Camera Movie | 1×3 · 9p | smooth | 1 |  |
| 30162 | Minifig Binoculars with Round Eyepiece | 1×1 · 1.5p | smooth · no anti-studs | 0 |  |
| 30608 | Minifig Hair Flat Top | 1×2 · 2.76p | smooth · no anti-studs | 0 |  |
| 33078 | Minifig Food Sausage | 2×1 · 1p | smooth · no anti-studs | 0 |  |
| 33085 | Minifig Food Banana | 2×2 · 1.67p | smooth · no anti-studs | 0 |  |
| 33183 | Minifig Food Carrot Top | 1×1 · 5.23p | smooth · no anti-studs | 0 |  |
| 40233 | Minifig Hair Short Tousled | 2×2 · 3.96p | smooth · no anti-studs | 0 |  |
| 40239 | Minifig Hair Long Straight | 2×2 · 7.79p | smooth · no anti-studs | 0 |  |
| 40251 | Minifig Hair Long Wavy | 2×2 · 5.87p | smooth · no anti-studs | 0 |  |
| 62696 | Minifig Hair Ponytail with Long Bangs | 2×2 · 7.74p | smooth · no anti-studs | 0 |  |
| 62810 | Minifig Hair Short, Tousled with Side Parting | 1×2 · 3.25p | smooth · no anti-studs | 0 |  |
| 64798 | Minifig Hair Backslick | 2×2 · 3.78p | smooth · no anti-studs | 0 |  |
| 86035 | Minifig Cap with Short Arched Peak | 1×2 · 2.13p | smooth | 0 |  |
| 87990 | Minifig Hair with Ponytail and Swept Sideways Fringe | 2×2 · 4.57p | smooth | 0 |  |
| 92081 | Minifig Hair Combed Front to Rear | 1×1 · 3.57p | smooth | 0 |  |
| 92746 | Minifig Hair Tousled and Layered | 2×2 · 3.9p | smooth · no anti-studs | 0 |  |
| 93219 | Minifig Baseball Cap with Button on Top | 1×2 · 2.44p | smooth | 0 |  |
| 95328 | Minifig Hair Mid-Length Smooth Wide Bob Cut | 2×2 · 4.23p | smooth · no anti-studs | 0 |  |
| 98385 | Minifig Hair Spiked | 2×2 · 4.24p | smooth · no anti-studs | 0 |  |
| 99930 | Minifig Hair Short Combed Sideways with Left Parting | 1×2 · 3.54p | smooth · no anti-studs | 0 |  |
| 3962b | Minifig Radio with Long Handle | 1×1 · 9.13p | smooth · no anti-studs | 2 |  |
| 4449-f1 | Minifig Suitcase (Closed) | 2×1 · 4.12p | smooth · no anti-studs | 0 |  |
| 30089a | Minifig Camera Snapshot Type 1 | 2×1 · 2.75p | smooth · no anti-studs | 1 |  |

## Baseplates

| id | part | size | top | side | note |
|---|---|---|---|---|---|
| 3811 | Baseplate 32 x 32 | 32×32 · 1p | 1024 studs · no anti-studs | 0 | baseplate 32×32 (thin; prefer kit.base) |
