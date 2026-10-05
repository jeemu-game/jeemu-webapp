# JEEMU — Brand Identity & Design System Guide
*Version 3.0 • Frog Identity Edition • Smart Tabletop Console*

---

![Jeemu Brand Identity Board](file:///d:/Projects/jeemu/brand-assets/jeemu-brand-board.jpg)

---


## 1. Brand Essence & Strategic Positioning

### 1.1 The Core Purpose
Tabletop stacking games have created unforgettable game nights for half a century. But they share a fatal flaw: **printed text on wooden blocks is permanently static.** By the third game, every player already knows what is written on Block 14. The surprise evaporates, and the game returns to the shelf.

**Jeemu solves this permanently.**

Jeemu reinvents the wooden tumbling tower into an infinite physical-digital game console. By combining 45 wooden blocks embedded with NFC tags and an autonomous, display-equipped smart pedestal dock, Jeemu decouples the physical block from the content. The exact same wooden block can serve a hilarious party dare, an intimate truth prompt, or a high-pressure physical challenge—all **100% phone-free during live play**.

### 1.2 Core Brand Pillars

| Pillar | Essence | Physical / Digital Reality |
|---|---|---|
| **Wood + NFC** | Tactile Precision | 45 wooden blocks, each with an embedded NFC tag with a unique identity. Polished for a smooth slide. |
| **Panoramic IPS Smart Dock** | Hardware Intelligence | Autonomous truncated pyramid pedestal dock housing an integrated NFC reader, display, physical buttons, and rechargeable USB-C power. |
| **100% Phone-Free During Play** | Pure Social Friction | Zero app interaction required once synced. Tabletop immersion remains face-to-face, visceral, and tactile without blue-light distractions. |
| **Infinite Replayability** | Dynamic Experience Packs | 7 launch modes (Party, Date Night, Family, Icebreakers, Deep Talks, Fitness, Education) + AI Custom Studio for endless customized rule packs. |

### 1.3 Brand Positioning Statement
> **For** game night hosts, tabletop lovers, and friends seeking genuine social connection,  
> **Jeemu is** the smart wooden tower console that merges tactile craftsmanship with dynamic digital unpredictability,  
> **Delivering** infinite game modes and high-stakes social friction,  
> **Unlike** static novelty tumbling blocks or distracting app-based screen games,  
> **Because** Jeemu keeps your hands on the wood, your eyes on your friends, and the questions perpetually brand new.

### 1.4 Tagline Hierarchy
- **Primary Master Tagline:**  
  `"The Tabletop Game That Rewrites Its Own Rules."`
- **Secondary Action Hook:**  
  `"Pull a block. Tap it. Say something real."`
- **Narrative Anchor:**  
  `"One tower. Endless games."`
- **Philosophy Tag:**  
  `"Physical Meets Digital."`

---

## 2. Visual Identity & Telemetry Archetype

Jeemu operates on a **Swiss Industrial Print × Tactical Hardware Telemetry** aesthetic, elevated by tactile organic warmth. It discards generic SaaS clichés, pastel gradients, and generic card boxes in favor of rigid modular grids, high-density monospace telemetry, and disciplined contrast.

```
                  ┌────────────────────────────────────────┐
                  │ [JEEMU CONSOLE OS]         v2.6-PROD   │
                  │ TAG ID: BLK-14      STATUS: ACTIVE     │
                  │ MODE: PARTY_DECK    STAGE: SWAY (24/45)│
                  └────────────────────────────────────────┘
                                     │
                  ┌──────────────────┴──────────────────┐
                  │                                     │
           [ TACTICAL TELEMETRY ]               [ ORGANIC WARMTH ]
           • Forest Charcoal Substrate          • Natural Wood Blocks
           • Electric Jade Accent               • Bone-Sage Cream Typography
           • Rigid 90° CSS Grids                • Monumental Heritage Serif
           • Monospace Data Readouts            • Smooth Slide Finish
```

### 2.1 Aesthetic Directives & Dial Settings
- **Design Variance:** `8/10` (Asymmetric white space, split-screen balance, viewport-bleeding headlines).
- **Motion Intensity:** `6/10` (Subtle ambient luminous mesh, spring-physics micro-interactions, hardware LED pulses; zero lag).
- **Visual Density:** `4/10` in marketing spaces (breathing room, editorial calm) / `8/10` in hardware telemetry panels (tight monospace specs, razor-thin `1px` border dividers).

---

## 3. Brand Color System

The Jeemu color palette is calibrated around a **Forest Charcoal substrate** accented by high-contrast **Electric Jade** and warm **Bone-Sage Cream**. The standard "AI Purple/Blue" gradient aesthetic is **strictly prohibited**.

### 3.1 Color Swatches & Specifications

| Token Name | Hex Code | RGB | HSL | Role & Usage |
|---|---|---|---|---|
| `--bg-base` | `#0C100E` | `12, 16, 14` | `150°, 14%, 5%` | Primary background canvas (Forest Charcoal). |
| `--bg-black` | `#060A08` | `6, 10, 8` | `150°, 25%, 3%` | Deep void substrate, CRT screen wells, dropdown backdrops. |
| `--bg-surface` | `#111613` | `17, 22, 19` | `144°, 13%, 8%` | Raised structural card panels and dock housings. |
| `--bg-card` | `rgba(17,23,19,0.85)` | — | — | Glassmorphic floating surfaces with `1px` inner refraction. |
| `--jade-primary`| `#00D97E` | `0, 217, 126` | `155°, 100%, 43%` | Primary brand accent, active NFC beacon, interactive CTAs. |
| `--jade-hover` | `#1AE88D` | `26, 232, 141` | `153°, 82%, 51%` | Hover & focus states, active micro-animations. |
| `--jade-dark` | `#00A85E` | `0, 168, 94` | `154°, 100%, 33%` | Gradient terminus, pressed states, badge shadows. |
| `--text-main` | `#E2EDE5` | `226, 237, 229` | `136°, 26%, 91%` | Primary editorial headings and high-priority copy (Bone-Sage). |
| `--text-muted` | `#8EA89A` | `142, 168, 154` | `148°, 13%, 61%` | Secondary copy, descriptors, technical metadata. |
| `--text-faint` | `#546B62` | `84, 107, 98` | `157°, 12%, 37%` | Inactive states, disabled telemetry, grid ticks. |
| `--wood-tone` | `#D9B48F` | `217, 180, 143` | `30°, 48%, 71%` | Natural polished wood representation. |
| `--alert-crimson`| `#FF3B30` | `255, 59, 48` | `4°, 100%, 59%` | Stage 3 Tremor warning, block penalty, hardware faults. |

### 3.2 Color Ratios & Application Rules
- **60% Substrate:** Deep Forest Charcoal (`#0C100E` / `#111613`). Never use generic `#000000`.
- **30% Neutral Harmony:** Bone-Sage Cream (`#E2EDE5`) and Cool Slate (`#8EA89A`).
- **10% Kinetic Highlight:** Electric Jade (`#00D97E`). Restrict to purposeful focal points (NFC indicator, action triggers, primary buttons, streak badges).

---


## 4. Typographic Architecture

Jeemu speaks in three voices. **Bagel Fat One** is the loud one: a chunky, rounded display face whose soft counters echo the frog's body and the polished corners of the wooden blocks. **Space Mono** labels everything the console would say. **Plus Jakarta Sans** carries the reading.

```
[ DISPLAY ]  -> "Frog mood swings"  •  "One tower. Endless games."
                Bagel Fat One (Regular) • Chunky, rounded, friendly

[ LABEL ]    -> "JEEMU · FROG · EXPRESSION SHEET"
                Space Mono • Console readouts, captions, chips

[ BODY / UI ]-> "Pull a block. Tap it. Say something real."
                Plus Jakarta Sans • Clean reading text and interface copy
```

> [!NOTE]
> The earlier **Combo** typeface (`Combo-Regular.ttf`) is retired. It is a thin, condensed hand-lettered face and does not match the frog's weight. The file stays in `brand-assets/` for legacy reference only.

### 4.1 Typography Specifications

| Role | Typeface | Source / File | Weight | Tracking | Usage |
|---|---|---|---|---|---|
| **Display** | **Bagel Fat One** | `brand-assets/BagelFatOne-Regular.ttf` (SIL OFL) | Regular (400) | `-0.01em` | Wordmark, hero and section titles, card titles, tagline. Never below 18px. |
| **Label** | **Space Mono** | Google Fonts | 400, 700 | `+0.04em` to `+0.1em` | Console screen text, tag IDs, eyebrow labels, referral codes, chips. |
| **Body / UI** | **Plus Jakarta Sans** | Google Fonts | 400, 500, 600 | Normal | Narrative copy, rules, FAQ, buttons. |

### 4.2 Web & Digital Implementation

```css
@import url('https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Space+Mono:wght@400;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

:root {
  --font-display: 'Bagel Fat One', 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif;
  --font-label:   'Space Mono', 'JetBrains Mono', monospace;
  --font-sans:    'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
}

.brand-display-hero {
  font-family: var(--font-display);
  font-size: clamp(3rem, 6.5vw, 5.5rem);
  line-height: 0.98;
  color: var(--text-main);
}
```

Email clients rarely load web fonts. Always declare the fallback stack above, and render the logo and any display-type moment as an image.

### 4.3 Typographic Scale & Hierarchy
- **Hero (`H1`):** `clamp(3rem, 6vw, 5rem)` • leading `0.98` • Bagel Fat One.
- **Section (`H2`):** `clamp(2.2rem, 4vw, 3.2rem)` • leading `1.05` • Bagel Fat One.
- **Card title (`H3`):** `1.35rem` to `1.6rem` • leading `1.2` • Bagel Fat One.
- **Body:** `1.05rem` to `1.15rem` • leading `1.65` • max `65ch` • Plus Jakarta Sans.
- **Labels:** `0.72rem` to `1rem` • uppercase • Space Mono.

---

## 5. Logo System & Construction

### 5.1 The Frog Mark
The Jeemu logo is the mascot, reduced. A chunky frog in sunglasses with a single jade flame on its head.

1. **The frog** is the player at the table: relaxed, a little smug, ready to snatch a block with its tongue.
2. **The flame** is the spark of conversation that lights when a block is tapped. It is the only element that changes size with game state.
3. **The sunglasses** keep the mark calm at 16px, where eyes would turn to noise.

![Jeemu logo, stacked](file:///d:/Projects/jeemu/brand-assets/logos/png/jeemu-logo-stacked.png)

**Mark vs. mascot.** The *mark* is the simplified, flat, heavy-outline version for logos and small sizes (no feet, no cheeks). The *mascot* adds feet, cheeks, arms and expressions for illustration. Never use the mascot art where the mark is specified.

### 5.2 Wordmark Geometry
- **Glyphs:** `JEEMU`, all caps, set in **Bagel Fat One** and converted to outlines. Never retype the wordmark; use the supplied files.
- **Horizontal lockup:** the mark sits left, optically centred on the cap height. Gap between mark and `J` equals roughly 12% of lockup width.
- **Stacked lockup:** the mark sits centred above the wordmark, with a gap equal to the flame's height.
- **App icon / favicon:** the mark on a Forest Charcoal squircle (`rx=118` on 512) with a faint jade keyline.

### 5.3 Clear Space & Rules of Restraint
- **Clear space:** the width of one frog eye bump on every side.
- **Minimum size:** mark only `20px`; horizontal lockup `120px` wide; stacked lockup `96px` wide.
- **Colour:** body `#00C97B`, belly and flame core `#A8E8C6`, flame `#00D97E`, ink `#06100A`. One-colour versions use bone-sage, charcoal or pure black.
- **Banned:**
  - Never recolour the frog (no purple, pink or rainbow frogs).
  - Never remove the sunglasses from the mark or the flame from any version.
  - Never add drop shadows, glows or outlines around the lockup.
  - Never place the full-colour mark on busy photography without a dark scrim.
  - Never use the retired flame-drop icon or the Combo wordmark.

### 5.4 Master Production Suite

All files are generated from one script, [build-logos.cjs](file:///d:/Projects/jeemu/brand-assets/build-logos.cjs), so every variant stays in sync. Run `node ../brand-assets/build-logos.cjs` from `jeemu-webapp/` to regenerate SVGs and PNGs.

| Asset | Format | Mode | Use |
|---|---|---|---|
| [jeemu-logo-horizontal.svg](file:///d:/Projects/jeemu/brand-assets/logos/jeemu-logo-horizontal.svg) | SVG + PNG | Full colour, cream text, transparent | Website nav and footer, email header, video bugs. |
| [jeemu-logo-horizontal-dark-bg.svg](file:///d:/Projects/jeemu/brand-assets/logos/jeemu-logo-horizontal-dark-bg.svg) | SVG + PNG | On Forest Charcoal | Decks, doc headers, splash screens. |
| [jeemu-logo-horizontal-light.svg](file:///d:/Projects/jeemu/brand-assets/logos/jeemu-logo-horizontal-light.svg) | SVG + PNG | Full colour, charcoal text | Light backgrounds, white-paper documents. |
| [jeemu-logo-stacked.svg](file:///d:/Projects/jeemu/brand-assets/logos/jeemu-logo-stacked.svg) | SVG + PNG | On Forest Charcoal | Box top, campaign title cards, square banners. |
| [jeemu-logo-stacked-light.svg](file:///d:/Projects/jeemu/brand-assets/logos/jeemu-logo-stacked-light.svg) | SVG + PNG | Charcoal text, transparent | Stationery, warranty cards, light packaging. |
| [jeemu-logo-mark.svg](file:///d:/Projects/jeemu/brand-assets/logos/jeemu-logo-mark.svg) | SVG + PNG | Mark only | Avatars, hardware tap indicator, social. |
| [jeemu-app-icon.svg](file:///d:/Projects/jeemu/brand-assets/logos/jeemu-app-icon.svg) | SVG + PNG | Charcoal squircle + mark | iOS / Android, PWA, macOS dock. |
| [favicon.svg](file:///d:/Projects/jeemu/brand-assets/logos/favicon.svg) | SVG | Same as app icon | Browser tab. `apple-touch-icon.png` is in `logos/png/`. |
| [jeemu-logo-laser-etch.svg](file:///d:/Projects/jeemu/brand-assets/logos/jeemu-logo-laser-etch.svg) | SVG | Pure black, line + solid | CNC / laser engraving on blocks, stamps. |
| [jeemu-logo-mark-laser-etch.svg](file:///d:/Projects/jeemu/brand-assets/logos/jeemu-logo-mark-laser-etch.svg) | SVG | Pure black, mark only | Block side facet, pedestal deboss. |
| [jeemu-logo-monochrome-dark.svg](file:///d:/Projects/jeemu/brand-assets/logos/jeemu-logo-monochrome-dark.svg) | SVG + PNG | Bone-sage one colour | OLED / LCD menus, single-colour dark print. |
| [jeemu-logo-monochrome-light.svg](file:///d:/Projects/jeemu/brand-assets/logos/jeemu-logo-monochrome-light.svg) | SVG + PNG | Charcoal one colour | Manuals, B/W print. |

---

## 6. Mascot Identity: The Frog

The frog is the living spirit of the Jeemu console. It reacts to every turn: cool when nothing is happening, aghast when the tower wobbles, ecstatic when a dare lands. Source concepts: [Jeemu Mascot Concepts.pdf](file:///d:/Projects/jeemu/brand-assets/Jeemu%20Mascot%20Concepts.pdf).

> [!NOTE]
> "The Frog" is a working name. It replaces **Boomie**, the pyramid-shaped mascot from v2.0. Boomie artwork is archived in `brand-assets/archive/boomie-v2/`.

### 6.1 Anatomy

1. **Round body, wide stance.** A squat oval with a pale mint belly. Never a tall or thin frog.
2. **Two eye bumps** on top of the head, each with a thick ink outline. Eyes are the main emotion channel.
3. **The jade flame** sits between the eyes. It is always there. Size carries state: tiny when asleep, normal at rest, huge on KABOOM.
4. **Cheek blush**: two mint ovals. Always present on the full mascot.
5. **Sunglasses** are the default look ("Chill"). They slide down, come off, or change shape for each deck.
6. **Tongue** is the signature move: it snatches a block and gulps it.
7. **Thick ink outline** (`#06100A`) on every shape, flat fills, no gradients.

### 6.2 Mood Swings: Expression Sheet

![Frog expression sheet](file:///d:/Projects/jeemu/brand-assets/frog-expression-sheet.png)

| State | Trigger | Look |
|---|---|---|
| **Chill** | Default / idle | Shades on, easy smile, normal flame. |
| **Peeking** | A risky block is pulled | Shades slide down, one suspicious look. |
| **Shook** | The tower wobbles | Pinpoint pupils, open mouth, sweat drop. |
| **LOL** | Someone's dare lands | `> <` eyes, tears, big open mouth. |
| **Smitten** | Date Night deck | Heart eyes, floating hearts. |
| **Not your turn** | Waiting or paused | Eyes closed, flame turned way down, `Zz`. |
| **Tongue snatch** | Block tapped on the dock | Wide eyes, tongue zaps the block. |
| **KABOOM** | Dare revealed | Flame goes huge, arms up, sparks. |

### 6.3 One Frog, Every Kind of Night: Deck Outfits

![Frog decks and hero](file:///d:/Projects/jeemu/brand-assets/frog-decks-hero.png)

| Deck | Outfit |
|---|---|
| **Party** | Party hat, shades, one arm up, confetti. |
| **Date night** | Heart-shaped shades, a rose in its mouth. |
| **Family** | Balances the wooden tower on its head, arms up, very proud. |
| **Hero: The lily pad** | The Jeemu dock is its lily pad: black frustum, jade rim, `DARE!` on the screen. Tap rings pulse where the block goes. |

The wooden blocks and the dock are the only props that appear in every deck.

### 6.4 Vector Mascot Set

| File | State |
|---|---|
| [jeemu-frog-chill.svg](file:///d:/Projects/jeemu/brand-assets/mascot/jeemu-frog-chill.svg) | Chill (default) |
| [jeemu-frog-shook.svg](file:///d:/Projects/jeemu/brand-assets/mascot/jeemu-frog-shook.svg) | Shook |
| [jeemu-frog-sleepy.svg](file:///d:/Projects/jeemu/brand-assets/mascot/jeemu-frog-sleepy.svg) | Not your turn |
| [jeemu-frog-smitten.svg](file:///d:/Projects/jeemu/brand-assets/mascot/jeemu-frog-smitten.svg) | Smitten |
| [jeemu-frog-kaboom.svg](file:///d:/Projects/jeemu/brand-assets/mascot/jeemu-frog-kaboom.svg) | KABOOM |

PNG exports (1024px, transparent) sit beside each SVG. The remaining states (Peeking, LOL, Tongue snatch, deck outfits) live in the illustrated PDF sheets until they are vectorised.

### 6.5 Mascot Lettering
Mascot captions and speech use **Bagel Fat One**. Anything the console says (`DARE!`, `hmm`, `...`) uses **Space Mono** on a cream rounded chip with an ink outline.

### 6.6 Guardrails

1. **Clear space:** half the frog's width on every side. Never crowd the flame.
2. **Invariants:** the jade flame, the thick ink outline, the round-body silhouette and the mint belly appear in every illustration.
3. **Colour:** body `#00C97B`, belly `#A8E8C6`. Red (`#FF3B30`) is only for tongue, hearts and the alert state.
4. **Forbidden:**
   - ❌ No realistic skin, teeth or photographic textures.
   - ❌ No recolouring the frog or the flame.
   - ❌ No gradients, glows or 3D renders on the character.
   - ❌ No removing the flame, even when the frog is asleep (shrink it instead).
   - ❌ Never use the frog in a negative moment that punishes the player. It teases; it never mocks.

---

## 7. Physical Hardware & Design Components

```
                   [ 45-BLOCK WOODEN TOWER ]
                   ┌──────────────────────────┐
                   │   WOODEN BLOCK:          │   <- Standard Jenga Sizing
                   │   Polished Wood Finish   │   <- Smooth Slide
                   └──────────────────────────┘
                   ╔══════════════════════════╗   <- Pedestal Top Platform
                ┌──╨──────────────────────────╨──┐
               /       (((o))) NFC READING AREA   \ <- Block Identification Zone
              /    ┌───────────────────────────┐   \
             /     │    2.8" SLANTED DISPLAY   │    \ <- Content & Status Screen
            /      │  [BOOMIE]   30s CLOCK     │     \
           /       └───────────────────────────┘      \
          /         [1]   [2]   [3]   [4]   [5]        \ <- Physical Buttons
         └─────────────────────────────────────────────┘
         ▲  TRUNCATED PYRAMID PEDESTAL (FRUSTUM) BASE   ▲
```

### 7.1 Material & Hardware Components
1. **The Wooden Blocks (45 Base Set + 9 Extension):**
   - **Material:** Natural solid wooden blocks with warm organic grain variation, polished for a smooth slide.
   - **Dimensions:** Standard Jenga sizing.
   - **Block Signature:** Individual blocks feature the etched/script `Jeemu` branding along the side facet.
   - **NFC Technology:** Each wooden block contains an embedded NFC tag with a unique identity. The physical block identity remains fixed while the content associated with that block dynamically changes between game configurations.
2. **The Jeemu Smart Base / Console Dock:**
   - **Form Factor:** 4-sided truncated pyramid (frustum) pedestal providing a stable base to hold and restack the wooden tower.
   - **Finish & Color:** Textured matte dark charcoal / off-black finish (`#0C100E`).
   - **Top Tap Deck:** Features an embossed flame icon on the top platform marking the designated NFC block tapping zone.
   - **Front Slanted Face:** Houses the ergonomic angled rectangular display for viewing questions, dares, and turn status, viewable by all players around the table.
   - **Side Facet:** Features the embossed flame icon and `Jeemu` brand signature.
   - **Independence:** Operates 100% independently during live gameplay with offline logic and rechargeable battery power via USB-C. No phone required during play.

---

## 8. Voice & Tone Architecture

Jeemu speaks with two distinct, complementary voices:
1. **The Hardware Voice:** Calm, precise, understated, and engineered (like high-end Scandinavian or Swiss audio gear).
2. **The Tabletop Voice (the Frog):** Irreverent, sharp, witty, and socially observant.

### 8.1 Copywriting Directives

| Rule | Approved Approach | Forbidden AI Cliché |
|---|---|---|
| **Verbs over Hype** | *"Pull a block. Tap it. Say something real."* | *"Experience the next-gen gaming ecosystem."* |
| **Honest Friction** | *"Slide a block from the tower (carefully!)."* | *"Seamless, effortless gameplay."* |
| **Real Stakes** | *"By game three, static question blocks are dead."* | *"Elevate your party to new heights."* |
| **Phone-Free Focus**| *"Put your phone away. The dock handles the rest."* | *"Unleash an omnichannel companion matrix."* |

---

## 10. Packaging, Unboxing & Retail Architecture

Jeemu is a premium consumer hardware experience designed to compete visually on retail shelves and spark excitement during unboxing videos.

```
┌──────────────────────────────────────────────────────────────┐
│  JEEMU TACTILE UNBOXING ARCHITECTURE                         │
├──────────────────────────────────────────────────────────────┤
│  [TOP LID]         Matte Forest Charcoal Soft-Touch Rigid Box│
│                    Debossed Electric Jade Foil Flame Mark    │
│                    Bagel Fat One "JEEMU" wordmark in Bone-Sage UV    │
├──────────────────────────────────────────────────────────────┤
│  [LAYER 1: DOCS]   Black Vellum Envelope with Setup Card     │
│                    "Slide, tap, play. Zero screens needed."  │
├──────────────────────────────────────────────────────────────┤
│  [LAYER 2: DOCK]   Custom-Molded Charcoal Pulp Cradle        │
│                    • Smart Frustum Pedestal Dock             │
│                    • Braided Forest Green USB-C Cable        │
├──────────────────────────────────────────────────────────────┤
│  [LAYER 3: TOWER]  Velvet-Lined Wooden Block Holster         │
│                    • 45 Polished NFC Wooden Blocks           │
│                    • Woven Emerald Pull-Ribbon for Release   │
└──────────────────────────────────────────────────────────────┘
```

### 10.1 Box Specifications & Materials
- **Box Type:** Two-piece rigid telescope box (heavyweight 1200gsm greyboard wrapped in 157gsm FSC-certified art paper).
- **Outer Finish:** Matte soft-touch scratch-resistant film (`#0C100E` Forest Charcoal base).
- **Finishing Highlights:**
  - **Flame Mark:** High-gloss spot UV + micro-embossed Electric Jade foil stamp (`#00D97E`).
  - **Wordmark:** Raised clear spot UV over Bone-Sage (`#E2EDE5`) lettering in Bagel Fat One.
  - **Side Facet Telemetry:** Subtle muted slate (`#8EA89A`) monospace text with razor-thin `1px` grid rules.
- **Inner Cradle:** 100% recyclable molded bamboo/sugar-cane pulp in dyed matte charcoal, custom-molded to eliminate plastic blister packs.

### 10.2 Retail Front & Side Facet Hierarchy
- **Primary Face (Top):**
  - Minimalist centered lockup: [jeemu-logo-stacked.svg](file:///d:/Projects/jeemu/brand-assets/logos/jeemu-logo-stacked.svg).
  - Subtitle: `"The Tabletop Game That Rewrites Its Own Rules"` (Bagel Fat One, `18pt`).
- **Front Side Panel:**
  - `JEEMU CONSOLE OS • 45 NFC WOODEN BLOCKS • 100% PHONE-FREE LIVE PLAY`.
- **Bottom Panel (Regulatory & Compliance):**
  - Standard compliance cluster: CE, FCC ID, UKCA, RoHS, WEEE recycling wheelie bin.
  - Warning block: `CHOKING HAZARD - Small parts. Not for children under 3 years.`
  - Game specifications badge:
    ```
    ┌──────────┬──────────────┬───────────────┐
    │ AGES 14+ │ 2–8 PLAYERS  │ 15–45 MINUTES │
    └──────────┴──────────────┴───────────────┘
    ```
  - EAN-13 Barcode with serial number window.

### 10.3 The Quick-Start Unboxing Card
Inside the vellum envelope, users receive an oversized `140×90mm` textured black card (`350gsm`) printed in high-contrast Bone-Sage and Electric Jade:
1. **Step 1:** Tap power button on the back of the Smart Base.
2. **Step 2:** Stack the 45 wooden blocks atop the pedestal platform.
3. **Step 3 (Optional):** Open `jeemu.fun/sync` or the mobile app to pick a pack.
4. **Step 4:** Put phones away. Pull a block, tap the flame deck, and follow the screen.

---

## 11. Hardware CMF, Manufacturing & Etching Tolerances

To ensure brand consistency across physical production runs, the following tolerances must be strictly respected by hardware and wood fabrication partners:

### 11.1 Wooden Blocks Laser Engraving Specification
- **Positioning:** Centered along the length of the long side facet (`75mm × 25mm × 15mm`), indented `12mm` from the outer edge.
- **Asset Used:** [jeemu-logo-laser-etch.svg](file:///d:/Projects/jeemu/brand-assets/logos/jeemu-logo-laser-etch.svg).
- **Depth:** `0.40mm` (`±0.05mm` tolerance). Deep enough to provide tactile fingerprint feedback without creating snagging edges during block extraction.
- **Finish:** Clean carbonized dark walnut hue, light sandblasted post-etch, sealed with natural food-safe matte mineral wax.

### 11.2 Smart Pedestal Dock CMF (Color, Material, Finish)
- **Housing Material:** UV-stabilized ABS/Polycarbonate matte blend.
- **Colorway:** Custom Pantone matched to `--bg-base` (`#0C100E`). Zero glossy plastics.
- **Surface Texture:** Mold-Tech `MT-11010` (micro-fine matte satin) for fingerprint and glare resistance under ambient living room lighting.
- **Top NFC Tap Platform:**
  - Center debossed flame mark: `0.80mm` depth, smooth satin finish signaling the block placement zone.
- **Front Display Integration:**
  - Ergonomic viewing angle: Set at an angle for optimal 360° visibility around standard dining and coffee tables.
  - Acrylic window: Anti-glare AR-coated flush lens with zero bezel step (`<0.1mm` seam tolerance) to prevent wooden dust ingress.

---

## 12. Marketing, Social & Launch Media Kit

To maintain visual discipline across digital campaigns, crowdfunding, and social media, adhere to these templates:

```
┌──────────────────────────────────────────────────────────────┐
│  KICKSTARTER CAMPAIGN HERO BANNER (16:9 • 3840×2160)         │
├──────────────────────────────────────────────────────────────┤
│  [LEFT 60%]                              [RIGHT 40%]         │
│  • Monumental Bagel Fat One headline:            Cinematic 3D render │
│    "The Tabletop Game That               of the 45-block     │
│     Rewrites Its Own Rules."             tower restacked on  │
│  • Monospace Telemetry Subhead:          the glowing pedestal│
│    "45 NFC WOODEN BLOCKS • 100% OFFLINE" dock with Boomie    │
│  • Electric Jade Kickstarter CTA Badge   reacting nearby.    │
└──────────────────────────────────────────────────────────────┘
```

### 12.1 Digital Dimensions & Safe Zones
- **Kickstarter Main Project Image:** `3840×2160` (16:9 aspect ratio). Keep all text within the central `2560×1440` safe zone.
- **X / Twitter Header:** `1500×500px`. Right-aligned product hero render; left-aligned [jeemu-logo-horizontal.svg](file:///d:/Projects/jeemu/brand-assets/logos/jeemu-logo-horizontal.svg) with Bone-Sage tagline.
- **Discord / Avatar Profile Icon:** `512×512px` rounded circle housing [jeemu-app-icon.svg](file:///d:/Projects/jeemu/brand-assets/logos/jeemu-app-icon.svg) or Frog "chill" avatar.
- **YouTube / TikTok Video Framing:** Lower-third name tags styled as JetBrains Mono console chips on dark glass (`rgba(12, 16, 14, 0.85)`).

---

## 13. Master Brand Asset Checklist & Distribution Matrix

| Asset | Path | Format |
|---|---|---|
| Core origin story | [core-story.md](file:///d:/Projects/jeemu/documentation/core-story.md) | Markdown |
| Brand identity board | [jeemu-brand-board.jpg](file:///d:/Projects/jeemu/brand-assets/jeemu-brand-board.jpg) | JPG |
| Logo suite (12 files) | [logos/](file:///d:/Projects/jeemu/brand-assets/logos) | SVG + PNG (`logos/png/`) |
| Logo generator | [build-logos.cjs](file:///d:/Projects/jeemu/brand-assets/build-logos.cjs) | Node script |
| Wordmark outline data | [wordmark-path.json](file:///d:/Projects/jeemu/brand-assets/wordmark-path.json) | JSON |
| Mascot vectors | [mascot/](file:///d:/Projects/jeemu/brand-assets/mascot) | SVG + PNG |
| Frog expression sheet | [frog-expression-sheet.png](file:///d:/Projects/jeemu/brand-assets/frog-expression-sheet.png) | PNG |
| Frog decks + hero sheet | [frog-decks-hero.png](file:///d:/Projects/jeemu/brand-assets/frog-decks-hero.png) | PNG |
| Mascot concept source | [Jeemu Mascot Concepts.pdf](file:///d:/Projects/jeemu/brand-assets/Jeemu%20Mascot%20Concepts.pdf) | PDF |
| Display font | [BagelFatOne-Regular.ttf](file:///d:/Projects/jeemu/brand-assets/BagelFatOne-Regular.ttf) + [OFL](file:///d:/Projects/jeemu/brand-assets/BagelFatOne-OFL.txt) | TTF |
| Prototype photos | [tower](file:///d:/Projects/jeemu/brand-assets/jeemu-prototype-tower.jpg), [angled](file:///d:/Projects/jeemu/brand-assets/jeemu-prototype-angled.jpg), [side](file:///d:/Projects/jeemu/brand-assets/jeemu-prototype-side.jpg) | JPG |
| Web design tokens | [index.css](file:///d:/Projects/jeemu/jeemu-webapp/src/index.css) | CSS |
| Web brand files | `jeemu-webapp/public/brand/`, `favicon.svg`, `apple-touch-icon.png` | SVG / PNG |
| Signup email | [signup_confirmation.html](file:///d:/Projects/jeemu/jeemu-webapp/backend/app/templates/signup_confirmation.html) | HTML |
| Legacy (archived) | `brand-assets/archive/boomie-v2/`, `Combo-Regular.ttf` | Reference only |

