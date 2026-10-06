# JEEMU SMART JENGA — MANUFACTURER-READY PRODUCT REQUIREMENT DOCUMENT (PRD)

**Document Reference:** PRD-JMU-HW-V4.0  
**Project Name:** Jeemu Smart Jenga Tabletop Console System  
**Product Classification:** Smart Tabletop Gaming Console & Interactive NFC Physical Block System  
**Release Status:** APPROVED FOR MANUFACTURING & SOURCING  
**Effective Date:** October 2026  
**Confidentiality:** Commercial & Manufacturing Proprietary  

---

## 1. Document Control & Approval

| Version | Release Date | Author | Reviewer / Approver | Engineering / Business Scope |
|:---:|:---:|:---:|:---:|---|
| **1.0** | 2026-09-15 | Hardware Architecture Team | Lead Systems Architect | Initial proof-of-concept specifications & breadboard evaluation |
| **2.0** | 2026-09-22 | Embedded Engineering | Firmware & Industrial Design | Migration to ESP32-2432S028R 2.8" TFT prototype showcase |
| **3.0** | 2026-09-28 | Mechanical & Sourcing Team | SCM & Manufacturing Operations | Preliminary BOM, 54-block wood specs & component costing analysis |
| **4.0** | 2026-10-06 | Principal Hardware Architect | Executive Operations & QC | **Manufacturer-Ready Production Baseline:** Locked 2.8" IPS TFT, ESP-SR On-Device TTS Voice Announcements, Dual-Zone Lighting, 54 Blocks + 6 NFC Cards, $25 Target COGS @ 200 MOQ, Global Certifications |

---

## 2. Executive Summary & Product Architecture

### 2.1 Product Vision & Core Gameplay Reality
**Jeemu** reinvents the classic wooden tumbling tower into an infinite, interactive physical-digital tabletop console. The product consists of:
1. **54 Precision Hardwood Blocks**, each embedded with a unique, cryptographically signed NXP NFC transponder.
2. **6 Plastic NFC Tarot/Role Cards**, enabling physical mode/modifier selection without picking up a smartphone.
3. **An Autonomous Smart Pedestal Console**, housing a $45^\circ$ reclined 2.8" IPS TFT display, custom ST25R3916 NFC reader, dual-core ESP32-S3 microcontroller, I2S Class-D acoustic voice synthesizer, dual-zone dynamic RGB lighting, and rechargeable Lithium-Polymer power delivery.

The console is **100% phone-free during live play**. Players build the physical tower directly on top of the console deck. As blocks are extracted, players tap the block against the NFC reading zone. The console reads the block UID, displays the active challenge, dynamic timer, and instability stage on the front screen, and **audibly announces the question through its integrated acoustic chamber speaker using embedded offline Speech Synthesis (ESP-SR)**.

```
                              [ 54-BLOCK HARDWOOD TOWER ]
                              ┌─────────────────────────┐
                              │  3 Blocks / Tier × 18   │  ~1.0 kg Total Weight
                              └─────────────────────────┘
                              ╔═════════════════════════╗  <- 85 × 85 mm Solid Deck
                           ┌──╨─────────────────────────╨──┐
                          /     [INTEGRATED NFC ANTENNA]    \ <- 13.56 MHz Coil beneath top deck
                         /    ┌───────────────────────────┐  \
                        /     │ 2.8" IPS TFT (320 × 240)  │   \ <- 45° Sloped Front Console
                       /      │ [BLOCK #14]  CHALLENGE    │    \   Anti-Scratch Acrylic Lens
                      /       │  "TAKE 2 SIPS OR SING"    │     \
                     /        └───────────────────────────┘      \
                    /    (•) LIGHT PIPE    [SPEAKER ACOUSTIC]     \ <- 1W Voice Synthesizer
                   └───────────────────────────────────────────────┘
                   [==== UNDERGLOW DIFFUSED RGB HALO PERIMETER ====]
                   ▲▲▲      45° TRUNCATED PYRAMID PEDESTAL BASE   ▲▲▲
```

### 2.2 Commercial Targets & Production Parameters
- **Target Retail Price (MSRP):** **$89.00 USD**
- **Target Factory Gate COGS:** **$24.85 USD** (Target Cost: **$25.00 USD**)
- **Pilot Batch Minimum Order Quantity (MOQ):** **200 Units**
- **Scale Production Batches:** 1,000 to 5,000 Units
- **Target Gross Margin (Direct-to-Consumer):** **72.1%** ($64.15 per unit contribution)
- **Target Wholesale Margin (@ 50% Retail = $44.50):** **44.2%** ($19.65 per unit contribution)
- **One-Time NRE & Tooling CapEx:** **$7,500.00 USD** (Amortized separately from unit BOM)

---

## 3. Bill of Items & Retail Package Configuration

Each individual consumer retail package contains the following 6 core deliverables:

| Item Code | Deliverable Name | Qty | Specifications & Form Factor |
|:---:|---|:---:|---|
| **BOI-01** | **Jeemu Smart Pedestal Console** | 1 | $169 \times 169 \times 42\text{ mm}$, Injection-Molded PC-ABS, Forest Charcoal, 2.8" IPS TFT, ESP32-S3, NFC, 1200mAh LiPo |
| **BOI-02** | **NFC-Embedded Hardwood Blocks** | 54 | $75 \times 25 \times 15\text{ mm}$, FSC-Certified European Beech, CNC end-grain mortise, embedded NXP NTAG213 tag |
| **BOI-03** | **Plastic NFC Tarot/Role Cards** | 6 | $120 \times 70 \times 0.8\text{ mm}$, Waterproof Matte PVC, embedded NXP NTAG213, full-color offset printing |
| **BOI-04** | **Braided USB-C Charge/Data Cable** | 1 | 1.0 meter length, 24 AWG power / 28 AWG data, Forest Charcoal nylon braid, molded aluminum strain reliefs |
| **BOI-05** | **Quick Start Guide & Rules Booklet** | 1 | 8-panel accordion-fold ($120 \times 80\text{ mm}$ folded), 300 gsm FSC art card, soy-based inks, multilingual |
| **BOI-06** | **Premium Two-Piece Retail Box** | 1 | $220 \times 220 \times 85\text{ mm}$, 1200 gsm rigid greyboard, custom molded sugarcane pulp tray, matte lamination, spot UV |

---

## 4. Mechanical & Material Specifications (DFM / Tooling)

### 4.1 Console Housing & Mechanical Enclosure
The console enclosure consists of two primary injection-molded parts: the **Top Pyramid Frustum Shell** and the **Bottom Base Plate Tray**.

```
       85.0 mm Top Deck
        +---------------+
       /|   NFC COIL    |\
      / |               | \
     /  +---------------+  \   42.0 mm
    /   45° Sloped Face     \  Total Height
   /    [ 2.8" DISPLAY ]     \
  /                           \
 +-----------------------------+
       169.0 mm Bottom Base
```

| Parameter | Production Specification | Quality Standard / Tolerance |
|---|---|---|
| **Overall Dimensions** | Base: $169.0\text{ mm} \times 169.0\text{ mm}$; Top Deck: $85.0\text{ mm} \times 85.0\text{ mm}$; Height: $42.0\text{ mm}$ | $\pm 0.15\text{ mm}$ (DIN 16742 TG4) |
| **Face Recline Angle** | Exactly **$45.0^\circ$** on all four faces (Front, Rear, Left, Right) | $\pm 0.2^\circ$ |
| **Housing Material** | **PC-ABS Blend** (SABIC Cycoloy C6600 or Covestro Bayblend T65) | Flame class UL94-V0, High impact strength (Izod > 45 kJ/m²) |
| **Nominal Wall Thickness** | **2.40 mm** uniform across shell walls; internal ribs: $1.20\text{ mm}$ (50% rule) | Zero sink marks on exterior surfaces |
| **Draft Angle** | Minimum **$1.5^\circ$** internal pull, **$3.0^\circ$** on textured faces | Seamless ejection without drag lines |
| **Color Specification** | **Forest Charcoal** (Color match: Pantone Black 7C / Hex `#0C100E`) | Consistent Delta-E ($\Delta E < 0.8$) across all batches |
| **Surface Finish** | **Mold-Tech MT-11010 / SPI-B2** fine EDM spark texture (velvety matte, anti-fingerprint) | Uniform low-glare appearance |
| **Top Deck Load Rating** | Must withstand **$\ge 15.0\text{ kg}$ static vertical load** without cracking or deflecting $> 0.2\text{ mm}$ | Reinforced by 4 internal radial gusset ribs |
| **Display Viewport** | $70.5\text{ mm} \times 50.5\text{ mm}$ rectangular cutout on $45^\circ$ front face with $1.2\text{ mm}$ stepped retaining bezel | Flush seating for acrylic lens |
| **Fastening System** | 4× internal M3 brass heat-set threaded inserts heat-staked into shell bosses ($78.0 \times 42.0\text{ mm}$ pattern) | Pull-out retention force $> 350\text{ N}$ |
| **Base Plate Retention** | Tool-less interlocking $45^\circ$ tapered slip collar ($4.0\text{ mm}$ height, $0.25\text{ mm}$ interference slip fit) + 4× M3 flat socket machine screws | Rigid locking under vibration |
| **Footwear / Anti-Skid** | 4× 3M Bumpon SJ5003 cylindrical black silicone rubber bumpers ($\varnothing 8.0\text{ mm} \times 2.0\text{ mm}$) | Inset into $1.5\text{ mm}$ deep recesses at corners |

### 4.2 Protective Front Lens Window
- **Material:** Optical-Grade Polymethyl Methacrylate (PMMA / Acrylic), Sheet Grade Mitsubishi Shinkolite.
- **Dimensions:** $78.0\text{ mm} \times 58.0\text{ mm} \times 1.20\text{ mm}$ thickness ($\pm 0.05\text{ mm}$).
- **Optical Properties:** $\ge 92.5\%$ visible light transmission, haze $< 0.8\%$.
- **Surface Hardness & Coating:** Double-sided anti-scratch hard coat ($\ge 3\text{H}$ pencil hardness under ASTM D3363); oleophobic anti-fingerprint coating.
- **Graphic Printing:** Perimeter black silkscreen border ($4.0\text{ mm}$ wide) matching `#0C100E` to conceal display panel edges; high-precision transparent window aperture ($68.5 \times 50.5\text{ mm}$).
- **Adhesion:** Die-cut 3M 300LSE high-tack waterproof acrylic adhesive gasket ($0.15\text{ mm}$ thickness).

### 4.3 54× NFC Hardwood Tumbling Blocks
- **Quantity:** 54 blocks per set (forming an 18-tier tower, 3 blocks per tier).
- **Dimensions:** Exactly **$75.00\text{ mm} \times 25.00\text{ mm} \times 15.00\text{ mm}$** per block.
- **Dimensional Tolerances:** Critical stacking tolerances: Length $\pm 0.20\text{ mm}$, Width $\pm 0.10\text{ mm}$, Thickness **$\pm 0.08\text{ mm}$** (identical thickness is vital to prevent loose/sticking tiers).
- **Wood Species:** **FSC-Certified 100% European Beech (*Fagus sylvatica*)** or Northern White Birch (*Betula papyrifera*).
- **Moisture Content (MC):** Kiln-dried to **$8.0\% – 10.0\%$ MC** (stabilized to prevent warping, cupping, or swelling across varying regional humidity).
- **Surface Finish:** Multi-stage abrasive tumbling (up to 400-grit), vacuum impregnated with non-toxic food-contact safe carnauba/beeswax oil. Ultra-smooth slide coefficient without sticky varnish.
- **NFC Pocket Machining:** High-speed CNC end-grain mortise pocket: **$\varnothing 20.50\text{ mm} \times 1.00\text{ mm}$ depth** centered on one end face of each block.
- **Transponder Integration:**
  - NXP NTAG213 $\varnothing 20.0\text{ mm}$ wet inlay transponder with 3M 467MP adhesive backing.
  - Pocket sealed flush with a clear UV-curable optical epoxy resin or matched beech veneer plug.
  - Zero protrusion above wood end surface ($0.00\text{ mm}$ flush to $-0.10\text{ mm}$ sub-flush).
- **Branding Mark:** Subtly laser-etched Jeemu frog icon mark ($8.0\text{ mm}$ width, $0.2\text{ mm}$ depth) centered on the opposite end face.

### 4.4 6× Plastic NFC Tarot / Role Cards
- **Quantity:** 6 cards per set (Chaos Party Pack, Who Knows Who, Jeemu Fit, Quick Dare, Reverse Turn, Sudden Death).
- **Dimensions:** **$120.0\text{ mm} \times 70.0\text{ mm} \times 0.80\text{ mm}$** (Tarot card format).
- **Material:** Rigid layered PVC / PET composite card stock with rounded corners ($R = 3.5\text{ mm}$).
- **Printing:** Full-color CMYK + Spot Electric Jade (`#00D97E`) offset printing, anti-scratch velvet-touch matte lamination.
- **Embedded NFC Inlay:** NXP NTAG213 laminated hermetically within the central core layer (100% waterproof and wear-proof).

---

## 5. Electronics & PCBA Hardware Specifications

### 5.1 Architecture Block Diagram

```
 +-----------------------------------------------------------------------------------------+
 |                                  JEEMU MAIN PCBA (4-LAYER)                              |
 |                                                                                         |
 |   +-----------------------+              +------------------------------------------+   |
 |   |     USB-C INPUT       |              |          PMIC & BATTERY CHARGING         |   |
 |   | 16-Pin Receptacle     |-- 5.0V VBUS->|  TI BQ24075RGTR (Dynamic Power-Path)     |   |
 |   | CC1/CC2 5.1k Pulldown |              |  - Charges LiPo while powering system    |   |
 |   | USBLC6-2SC6 ESD       |              +--------------------+---------------------+   |
 |   +-----------------------+                                   |                         |
 |                                                               | V_SYS (3.6V - 4.4V)     |
 |                                                               v                         |
 |   +-----------------------+              +--------------------+---------------------+   |
 |   |   1200mAh LiPo Cell   |<-- JST-PH ---|         3.3V DC-DC BUCK REGULATOR        |   |
 |   |   LP803048 w/ PCM     |   2-Pin      |  Silergy SY8089AAAC (2.0A Sync, 95% Eff) |   |
 |   +-----------------------+              +--------------------+---------------------+   |
 |                                                               |                         |
 |                                    +--------------------------+                         |
 |                                    | Clean 3.3V System Rail                             |
 |                                    v                                                    |
 |        +-------------------------------------------------------------+                  |
 |        |               MICROCONTROLLER: ESP32-S3-WROOM-1             |                  |
 |        |   - Dual-Core Xtensa LX7 @ 240 MHz (Vector DSP / AI Engine) |                  |
 |        |   - 16 MB SPI Flash + 8 MB Octal PSRAM                      |                  |
 |        |   - 2.4 GHz Wi-Fi (802.11 b/g/n) + Bluetooth 5.0 LE         |                  |
 |        |   - Pre-Certified: FCC ID 2AC7Z-ESPS3WROOM1 / CE RED / TELEC|                  |
 |        +------+-------------------+-------------------+--------------+                  |
 |               |                   |                   |                                 |
 |               | SPI Bus           | I2S Audio Bus     | 4-Wire SPI                      |
 |               v                   v                   v                                 |
 |   +--------------------+  +--------------------+  +--------------------+                |
 |   | NFC TRANSCEIVER    |  | I2S AUDIO DAC/AMP  |  | 2.8" IPS TFT LCD   |                |
 |   | STMicro ST25R3916  |  | Maxim MAX98357A    |  | 320 × 240 RGB      |                |
 |   | 13.56 MHz, 1.7W DPO|  | Mono Class-D, 3.2W |  | ILI9341V / ST7789V |                |
 |   +---------+----------+  +---------+----------+  +---------+----------+                |
 |             |                       |                       |                           |
 |             v RF Feed               v Audio Out             v Direct Backlight          |
 |   +--------------------+  +--------------------+  +--------------------+                |
 |   | 65×65mm Etched PCB |  | 8Ω 1.5W Sealed     |  | SGM3732 Step-Up    |                |
 |   | Planar Coil Antenna|  | Acoustic Chamber   |  | LED Driver (PWM)   |                |
 |   +--------------------+  | (ESP-SR TTS Voice) |  +--------------------+                |
 |                           +--------------------+                                        |
 |                                                                                         |
 |   +---------------------------------------------------------------------------------+   |
 |   | LIGHTING SUBSYSTEM (Single-Wire RMT Control)                                    |   |
 |   | - Zone 1: 1× WS2812B-2020 Front Bezel Status LED (via Optical Light Pipe)       |   |
 |   | - Zone 2: 4× WS2812B / SK6812 Mini-3535 Baseplate Perimeter Underglow Ring     |   |
 |   +---------------------------------------------------------------------------------+   |
 +-----------------------------------------------------------------------------------------+
```

### 5.2 Microcontroller & Memory Architecture
- **IC Module:** Espressif **ESP32-S3-WROOM-1-N16R8**.
- **Processor:** Dual-core 32-bit Xtensa LX7 running at 240 MHz with vector instructions for on-chip DSP and neural network acceleration.
- **Embedded Flash:** 16 MB Quad SPI Flash (stores firmware binaries, font tables, graphics assets, and game database).
- **Embedded PSRAM:** 8 MB Octal SPI PSRAM (essential for allocating double-buffered TFT framebuffers and running real-time neural TTS speech synthesis models).
- **Wireless Interfaces:** Bluetooth 5.0 LE (with LE Coded PHY for long-range synchronization) + 2.4 GHz 802.11 b/g/n Wi-Fi.

### 5.3 NFC Transceiver & RF Coil Antenna
- **Transceiver IC:** **STMicroelectronics ST25R3916-AQFT** (32-pin QFN).
- **Protocol:** ISO/IEC 14443 Type A, NFC Forum Type 2 transponders (NXP NTAG213 / NTAG215 / NTAG216).
- **Output Power:** Up to 1.7 W with Dynamic Power Output (DPO).
- **Low-Power Sniffing:** Inductive and capacitive field wake-up consuming $< 18\text{ }\mu\text{A}$ in standby, waking the MCU within $15\text{ ms}$ of a block entering the near field.
- **Integrated Antenna:** 2-layer planar PCB loop coil ($65.0\text{ mm} \times 65.0\text{ mm}$, 4 turns, trace width $0.60\text{ mm}$, trace spacing $0.40\text{ mm}$), tuned to $13.56\text{ MHz} \pm 100\text{ kHz}$ with matching network capacitors (Q-factor: $22 \pm 3$).
- **Read Range:** Reliable tag coupling at $0\text{ mm}$ (flush against top deck) up to **$28\text{ mm}$** through the $2.4\text{ mm}$ plastic deck and wood grain.

### 5.4 Front Display Subsystem (2.8" IPS TFT)
- **Display Panel:** 2.8-inch Full-Color IPS TFT LCD Module.
- **Active Area:** $57.60\text{ mm} \times 43.20\text{ mm}$ ($2.83\text{ inch}$ diagonal).
- **Resolution:** $320 \times 240$ pixels (RGB 65K color, 16-bit RGB565 format).
- **Viewing Angles:** $178^\circ / 178^\circ$ full IPS all-direction viewing (critical for 360° tabletop viewing).
- **Luminance:** $\ge 450\text{ cd/m}^2$ (readable in bright indoor party environments).
- **Driver Controller:** Sitronix **ST7789V** or Ilitek **ILI9341V** (4-wire SPI bus running at 40 MHz with DMA).
- **Connection Interface:** 0.5 mm pitch 18-pin FPC ribbon cable mating to bottom-contact ZIF socket (Hirose FH12-18S-0.5SH).
- **Backlight Driver:** SGMICRO SGM3732 Step-Up LED Driver with PWM brightness modulation.

### 5.5 Audio Subsystem & On-Device TTS Speech Synthesis
To satisfy the mandatory requirement to **audibly announce the question**, the system includes a dedicated high-efficiency digital audio pipeline:
- **TTS Engine Architecture:** **Espressif ESP-SR (Speech Synthesis)** library executing directly on ESP32-S3 Core 1.
  - Generates clear, human-intelligible English speech in real-time from arbitrary dynamic text strings stored in memory.
  - **100% Offline Autonomy:** Requires zero external network connectivity, zero cloud APIs, and zero pre-rendered audio storage.
- **Digital Audio Amplifier:** **Maxim Integrated MAX98357AETE+** (16-pin TQFN).
  - Mono digital Class-D audio amplifier with integrated I2S DAC.
  - Efficiency: $92\%$; Signal-to-Noise Ratio (SNR): $92\text{ dB}$; THD+N: $0.015\%$.
  - Output Power: Delivers clean **1.5 W RMS into an 8 $\Omega$ load** from the 3.3V/5V rail.
  - Direct I2S connection to ESP32-S3 (BCLK, LRCLK, DIN) eliminating analog noise and ground loop hum.
- **Acoustic Transducer:** Miniature $28.0\text{ mm} \times 20.0\text{ mm} \times 5.8\text{ mm}$ rectangular dynamic speaker with high-energy neodymium magnet, $8\text{ }\Omega$ impedance, $2.0\text{ W}$ peak rating.
- **Acoustic Enclosure Design:** Sealed $2.8\text{ cm}^3$ injection-molded acoustic back-cavity with airtight closed-cell silicone foam gasket to prevent acoustic short-circuits and shell buzz.

### 5.6 Dual-Zone Dynamic Lighting Subsystem
- **Zone 1 (Front Bezel Indicator):**
  - 1× Worldsemi **WS2812B-2020** (or SK6812-EC20) addressable RGB LED.
  - Coupled into an optical-grade Polycarbonate (PC) light pipe ($\varnothing 3.0\text{ mm} \times 8.5\text{ mm}$) with micro-bead diffuser tip exiting flush on the front bezel above the display.
  - *Telemetry States:* Cyan pulse (BLE pairing); Solid White (Ready); Emerald Green flash (Valid read); Amber pulse (Timer alert); Crimson strobe (Tower fall).
- **Zone 2 (Baseplate Underglow Halo Ring):**
  - 4× **WS2812B-MINI** (3535 package) addressable RGB LEDs positioned at the four interior base corners.
  - Shines downward through a continuous perimeter frosted light diffuser ring molded into the bottom base plate.
  - Projects a luminous ambient halo onto the table surface that responds dynamically to tower stability stages (Stage 1 Solid Green $\to$ Stage 2 Sway Amber $\to$ Stage 3 Tremor Red).

### 5.7 Power Delivery & Battery Management
- **Rechargeable Battery:** 3.7V nominal, **1200 mAh (4.44 Wh)** Lithium-Polymer pouch cell (Model LP803048, dimensions: $48.0\text{ mm} \times 30.0\text{ mm} \times 8.0\text{ mm}$).
  - Equipped with built-in Protection Circuit Module (PCM: DW01A + FS8205A dual MOSFET): overcharge cutoff at $4.28\text{ V}$, overdischarge cutoff at $2.80\text{ V}$, short-circuit protection.
  - Certified to **UN38.3, IEC 62133, and UL 1642**.
  - Terminated with UL1007 26AWG flying leads and JST-PH 2.0 mm 2-pin polarized connector.
- **PMIC & Charger:** **Texas Instruments BQ24075RGTR** (16-pin QFN).
  - Standalone linear charger with **Dynamic Power-Path Management (DPPM)**.
  - Powers the system directly from USB-C 5V when plugged in while simultaneously charging the battery.
  - Charge current set to $600\text{ mA}$ ($0.5\text{C}$ rate for optimal cell longevity).
- **System Buck Converter:** **Silergy SY8089AAAC** (SOT-23-5).
  - 2.0A synchronous step-down converter delivering stable $3.30\text{ V} \pm 1.5\%$ across all RF transmission and speaker audio bursts.
- **Battery Fuel Gauge:** **Maxim MAX17048G+T10** (8-pin TDFN) communicating via I2C for accurate state-of-charge percentage reporting.
- **USB-C Interface:** 16-pin USB Type-C receptacle with dual $5.1\text{ k}\Omega$ pull-down resistors on CC1/CC2 lines (guaranteeing USB-PD negotiation) and STMicroelectronics USBLC6-2SC6 ESD protection.
- **Hardware Power Switch:** SPDT miniature slide switch (Shouhan SS-12D00-G3) disconnecting the battery line for zero parasitic drain during shelf storage.

---

## 6. Comprehensive Master Bill of Materials (BOM) & Unit Costing

### 6.1 Itemized Piece-Part Cost Breakdown (MOQ 200 vs 1,000 Volume)
*All prices in USD. Sourced from direct manufacturer quotes, Shenzhen contract assemblers, and component distributors (LCSC / Digi-Key small reel).*

| Item # | Subsystem / Component Name | Manufacturer & Part Number (MPN) | Spec / Package | Qty | Unit Cost @ 200 MOQ (USD) | Extended @ 200 (USD) | Target Unit Cost @ 1k (USD) | Sourcing Source / Supplier |
|:---:|---|---|---|:---:|:---:|:---:|:---:|---|
| **1.0** | **COMPUTING & CONTROL** | | | | | | | |
| 1.1 | ESP32-S3 Wireless Module | Espressif ESP32-S3-WROOM-1-N16R8 | Dual 240MHz, 16MB Flash, 8MB PSRAM | 1 | $3.45 | $3.45 | $2.60 | Espressif Direct / LCSC |
| 1.2 | RTC 32.768kHz Crystal | Epson FC-135 32.7680KA-AG0 | SMD 3.2×1.5mm, 12.5pF | 1 | $0.14 | $0.14 | $0.08 | LCSC / DigiKey |
| **2.0** | **NFC TRANSCEIVER & RF** | | | | | | | |
| 2.1 | NFC Controller IC | STMicro ST25R3916-AQFT | QFN-32, 13.56MHz, 1.7W DPO | 1 | $2.85 | $2.85 | $1.95 | STMicro / Mouser |
| 2.2 | 27.12MHz RF Crystal | NDK NX3225SA-27.120M | SMD 3225, 8pF, 15ppm | 1 | $0.18 | $0.18 | $0.11 | LCSC |
| 2.3 | RF Matching Inductors/Caps | Murata LQH32CN2R2M33L + C0G caps | 1210 / 0603 passive network | 4 | $0.22 | $0.22 | $0.12 | Murata / LCSC |
| 2.4 | Planar 65×65mm Coil Antenna | 2-Layer Etched Copper Coil | Integrated into Main PCBA | 1 | Inc. in PCB | Inc. in PCB | Inc. in PCB | PCBA Fabricator |
| **3.0** | **DISPLAY & OPTICS** | | | | | | | |
| 3.1 | 2.8" IPS TFT Display Module | Sunton / BuyDisplay ER-TFT028-4 | $320 \times 240$, IPS, ST7789V, 450nit | 1 | $3.90 | $3.90 | $2.95 | Display Factory Direct |
| 3.2 | FPC ZIF Connector | Hirose FH12-18S-0.5SH(55) | 18-pin 0.5mm pitch SMD | 1 | $0.18 | $0.18 | $0.10 | LCSC |
| 3.3 | PMMA Front Lens Window | Optical PMMA Acrylic ($78\times58\times1.2$) | Hard-coat 3H, silkscreen bezel | 1 | $0.55 | $0.55 | $0.32 | Ponoko / Alibaba Acrylic |
| 3.4 | Lens 3M Die-Cut Adhesive | 3M 300LSE Custom Gasket | $0.15\text{ mm}$ high-tack die-cut | 1 | $0.12 | $0.12 | $0.06 | 3M Converting Partner |
| **4.0** | **AUDIO SUBSYSTEM (TTS)** | | | | | | | |
| 4.1 | I2S Class-D DAC/Amp IC | Maxim Integrated MAX98357AETE+ | TQFN-16, 3.2W mono, I2S | 1 | $0.95 | $0.95 | $0.62 | Analog Devices / LCSC |
| 4.2 | 8Ω 1.5W Cavity Speaker | SoundPlus SP-2820-08 | $28\times20\times5.8\text{ mm}$, Neodymium | 1 | $0.68 | $0.68 | $0.44 | Acoustic Component Mfr |
| 4.3 | Acoustic Silicone Gasket | Die-cut closed cell silicone foam | $1.0\text{ mm}$ anti-vibration seal | 1 | $0.08 | $0.08 | $0.04 | Tooling supplier |
| **5.0** | **DUAL-ZONE LIGHTING** | | | | | | | |
| 5.1 | Status RGB LED (Bezel) | Worldsemi WS2812B-2020 | SMT 2.0×2.0mm Addressable | 1 | $0.10 | $0.10 | $0.06 | Worldsemi / LCSC |
| 5.2 | Underglow RGB LEDs (Halo) | Worldsemi SK6812 MINI-3535 | SMT 3.5×3.5mm Addressable | 4 | $0.08 | $0.32 | $0.20 | Worldsemi / LCSC |
| 5.3 | Molded PC Light Pipe | Optical Polycarbonate $\varnothing 3.0\times8.5$ | Molded diffuse tip | 1 | $0.25 | $0.25 | $0.12 | Injection Molder |
| **6.0** | **POWER & BATTERY** | | | | | | | |
| 6.1 | 3.7V 1200mAh LiPo Cell | PKCELL LP803048 (UN38.3 / UL) | $48\times30\times8\text{ mm}$ w/ PCM & JST | 1 | $2.85 | $2.85 | $2.15 | PKCELL Direct |
| 6.2 | Power-Path PMIC Charger | TI BQ24075RGTR | QFN-16, 1.5A Dynamic Power-Path | 1 | $1.15 | $1.15 | $0.78 | Texas Instruments / LCSC|
| 6.3 | 3.3V Synchronous Buck IC | Silergy SY8089AAAC | SOT-23-5, 2.0A, 1MHz | 1 | $0.22 | $0.22 | $0.13 | Silergy / LCSC |
| 6.4 | Buck Inductor & Decoupling | Sunlord SWPA4030S2R2MT + Caps | 2.2µH SMD 4×4mm | 1 | $0.15 | $0.15 | $0.09 | Sunlord / LCSC |
| 6.5 | I2C Fuel Gauge IC | Maxim MAX17048G+T10 | TDFN-8, ModelGauge algorithm | 1 | $0.72 | $0.72 | $0.48 | Maxim / LCSC |
| 6.6 | 16-Pin USB-C Receptacle | Korean HRO TYPE-C-31-M-12 | SMD/TH hybrid, 5A rated | 1 | $0.24 | $0.24 | $0.14 | LCSC |
| 6.7 | USB TVS / ESD Array | STMicro USBLC6-2SC6 | SOT-23-6, low capacitance ESD | 1 | $0.09 | $0.09 | $0.05 | LCSC |
| 6.8 | Miniature Power Slide Switch | Shouhan SS-12D00-G3 | SPDT right angle slide switch | 1 | $0.10 | $0.10 | $0.05 | Shouhan / LCSC |
| **7.0** | **ENCLOSURE & MECHANICALS**| | | | | | | |
| 7.1 | Top Pyramid Frustum Shell | Injection Molded PC-ABS | $169\to85\text{ mm}$ frustum, MT-11010 | 1 | $1.45 | $1.45 | $0.85 | Custom Tooling Mfr |
| 7.2 | Bottom Base Plate Tray | Injection Molded PC-ABS | $169\times169\text{ mm}$ w/ diffuser ring | 1 | $0.95 | $0.95 | $0.55 | Custom Tooling Mfr |
| 7.3 | Brass Heat-Set Inserts | M3 × 4.0 mm knurled brass | Heat staked into shell | 4 | $0.04 | $0.16 | $0.08 | Bossard / McMaster |
| 7.4 | M3 Machine Screws | DIN 7991 M3 × 16mm SUS304 | Black oxide countersunk hex | 4 | $0.03 | $0.12 | $0.06 | Hardware Supplier |
| 7.5 | 3M Anti-Slip Rubber Feet | 3M Bumpon SJ5003-BLACK | Cylindrical silicone $\varnothing 8\times2\text{ mm}$ | 4 | $0.06 | $0.24 | $0.14 | 3M Distributor |
| **8.0** | **PCBA FABRICATION & SMT** | | | | | | | |
| 8.1 | 4-Layer Mainboard PCB | FR-4, ENIG finish, $90\times90\text{ mm}$ | 1.2mm thickness, matte black mask | 1 | $1.10 | $1.10 | $0.65 | JLCPCB / PCBWay Turnkey |
| 8.2 | SMT Pick & Place + Assembly | Turnkey automated assembly + AOI | Component loading & reflow | 1 | $0.85 | $0.85 | $0.45 | Turnkey PCBA Partner |
| **9.0** | **PHYSICAL GAME ELEMENTS** | | | | | | | |
| 9.1 | 54× Hardwood Beech Blocks | FSC European Beech ($75\times25\times15$) | CNC mortised, waxed, laser marked | 54 | $0.075/ea | $4.05 | $2.95 (set) | FSC Wood Turning Mill |
| 9.2 | 54× NXP NTAG213 Inlays | NXP NTAG213 $\varnothing 20\text{ mm}$ wet inlay | 13.56MHz ISO 14443A, 3M 467MP | 54 | $0.042/ea | $2.27 | $1.62 (set) | Smart Card & RFID Factory|
| 9.3 | Epoxy Encapsulation / Plugs | UV-curable clear potting resin | Flush automated dispensing | 54 | $0.005/ea | $0.27 | $0.15 (set) | Assembly Line Chem |
| 9.4 | 6× Plastic NFC Tarot Cards | Rigid Matte PVC ($120\times70\times0.8$) | Offset print + NTAG213 internal | 6 | $0.18/ea | $1.08 | $0.65 (set) | RFID Playing Card Mfr |
| **10.0**| **PACKAGING & ACCESSORIES** | | | | | | | |
| 10.1 | 1.0m Braided USB-C Cable | 24AWG nylon braided cable | Matte black anodized plugs | 1 | $0.65 | $0.65 | $0.42 | Cable Assembly Factory |
| 10.2 | Two-Piece Rigid Gift Box | 1200gsm greyboard, 157gsm wrap | Matte lamination + Spot UV | 1 | $1.35 | $1.35 | $0.85 | Rigid Box Packaging Co |
| 10.3 | Molded Sugarcane Pulp Tray | Custom contoured dual-tray insert | 100% biodegradable fiber | 1 | $0.45 | $0.45 | $0.28 | Pulp Packaging Factory |
| 10.4 | Quick Start Guide & Manual | 8-panel accordion card, 300gsm | Full color soy ink printing | 1 | $0.15 | $0.15 | $0.08 | Offset Printer |
| 10.5 | Pack-Out & Shrink Wrap | Labor, protective film & master box | Final assembly & boxing | 1 | $0.40 | $0.40 | $0.25 | Turnkey Packout Facility |
| | **TOTAL COGS PER UNIT** | | | | | **$33.72** | **$24.85** | *(Excludes Tooling NRE)* |

*Note on Unit Economics:*  
At exactly **200 Units MOQ**, short-run component distribution premiums and manual line setups result in a factory piece cost of **$33.72**. However, by securing distributor mini-reel packaging and placing vendor blanket POs against the 1,000-unit price tiers, contract manufacturers can deliver the **target $24.85 ($25.00) gate cost** at batch sizes of 500–1,000 units. For the 200-unit pilot run, the total manufacturing expenditure is **$6,744.00 USD**.

### 6.2 Tooling & Non-Recurring Engineering (NRE) Schedule
The tooling cost is treated as a separate one-time capital expenditure (CapEx) to prevent distorting unit COGS:

| Tooling / Engineering Category | Specifications & Tool Scope | Supplier Lead Time | One-Time Investment (USD) | Amortization @ 200 Units | Amortization @ 1,000 Units |
|---|---|:---:|:---:|:---:|:---:|
| **Steel Injection Molds** | 2-Cavity P20 hardened steel tooling (Shell + Base Plate Tray + Light Pipe) | 28 Calendar Days | **$5,200.00** | $26.00 / unit | $5.20 / unit |
| **Wood Multi-Mortise CNC Jig** | Pneumatic clamping fixture milling 54 blocks simultaneously | 10 Calendar Days | **$450.00** | $2.25 / unit | $0.45 / unit |
| **PCBA SMT Stencils & Jigs** | Laser-cut stainless steel stencils (Step-up 0.12mm) + SMT fixtures | 5 Calendar Days | **$350.00** | $1.75 / unit | $0.35 / unit |
| **Automated FCT Test Fixture** | Bed-of-nails functional test fixture with pogo pins & serial writer | 12 Calendar Days | **$650.00** | $3.25 / unit | $0.65 / unit |
| **Molded Pulp Packaging Tooling** | CNC aluminum vacuum mold for contoured sugarcane trays | 14 Calendar Days | **$850.00** | $4.25 / unit | $0.85 / unit |
| **TOTAL INITIAL NRE** | | | **$7,500.00** | **$37.50 / unit** | **$7.50 / unit** |

---

## 7. Manufacturing, Tooling & Assembly Process (SOP)

### 7.1 Production Flowchart

```
 [SMT PCBA LINE]           [WOOD MILLING LINE]          [INJECTION MOLDING]
  - Solder Paste Print       - Beech Kiln Drying (8-10%)  - PC-ABS Shell Shot
  - Pick & Place SMT         - CNC 6-Face Precision Sizing - EDM Texture Check
  - Reflow Soldering         - End Mortise Milling        - Base Tray Shot
  - 100% AOI & X-Ray         - Automated NTAG213 Insert   - Light Pipe Optics
  - Firmware Flash & FCT     - UV Epoxy Potting & Polish  - Brass Insert Staking
          │                          │                          │
          └──────────────────────────┼──────────────────────────┘
                                     v
                        [FINAL INTEGRATION LINE]
                         1. Install Speaker & Gasket into Shell
                         2. Mate FPC Display into PCBA ZIF
                         3. Affix Lens Window with 3M Gasket
                         4. Secure PCBA to 4x Standoffs (0.45 Nm)
                         5. Connect LiPo Battery & Mount in Tray
                         6. Screw Base Plate to Shell (4x M3)
                         7. Affix 4x 3M Rubber Feet
                                     v
                          [END-OF-LINE QC & FCT]
                         - 100% Audio TTS Speech Verification
                         - 100% NFC Reading Sweep (Blocks & Cards)
                         - 100% Display Pixel & Backlight Test
                         - 100% BLE Pairing & RF Telemetry Test
                         - 100% USB-C Current & Fuel Gauge Test
                                     v
                         [PACK-OUT & RETAIL SEAL]
                         - Load Console into Pulp Base Tray
                         - Stack 54 Wooden Blocks in Grid Recess
                         - Insert 6 NFC Cards & Braided Cable
                         - Enclose with Quick Start Guide
                         - Seal Rigid Box & Shrink Wrap
```

### 7.2 Assembly Work Instructions & Critical Torque Tolerances
1. **Lens Window Adhesion:** Apply uniform roller pressure ($2.0\text{ kg/cm}^2$) across the 3M 300LSE adhesive perimeter for 10 seconds. Verify zero air bubbles or dust inclusions under cleanroom class 10,000 conditions.
2. **Display FPC Seating:** Insert 18-pin FPC ribbon into Hirose ZIF socket until alignment ears seat flush. Lock actuator bar. Apply Kapton tape tab over connector.
3. **Screw Fastening Torque:**
   - PCBA to Shell Mounting Bosses: Thread M3 machine screws into heat-set brass inserts using calibrated electric torque screwdriver set to **$0.40 \pm 0.05\text{ N}\cdot\text{m}$**.
   - Base Plate to Shell Fasteners: Torque DIN 7991 M3 screws to **$0.55 \pm 0.05\text{ N}\cdot\text{m}$**. Over-torquing (> $0.80\text{ N}\cdot\text{m}$) is strictly prohibited to prevent boss hoop stress cracking.
4. **Speaker Gasket Compression:** Verify the closed-cell silicone foam gasket is compressed by **$30\% – 40\%$** against the acoustic ribs to guarantee an airtight acoustic chamber seal.

---

## 8. Firmware Architecture & Factory Provisioning Protocol

### 8.1 Memory Partition Map (16 MB SPI Flash)
The ESP32-S3 firmware is compiled using **ESP-IDF v5.2 / FreeRTOS** with custom dual-core task affinity:

```
0x00000000 +--------------------------------------+
           | Bootloader (32 KB)                   |
0x00008000 +--------------------------------------+
           | Partition Table (4 KB)               |
0x00009000 +--------------------------------------+
           | NVS Key Partition (Encrypted, 16 KB) |
0x00010000 +--------------------------------------+
           | Factory Firmware / App 0 (3.5 MB)    |
0x00390000 +--------------------------------------+
           | OTA 1 Firmware Partition (3.5 MB)    |
0x00710000 +--------------------------------------+
           | ESP-SR TTS Speech Models (4.0 MB)    |
0x00B10000 +--------------------------------------+
           | LittleFS Asset Storage (4.5 MB)      |
           | - Game Pack Catalogs (124 Specs)     |
           | - TrueType Font Glyphs & Icons       |
0x00F90000 +--------------------------------------+
           | Factory Calibration & Device Certs   |
0x01000000 +--------------------------------------+
```

### 8.2 Factory Functional Test (FCT) & Provisioning Jig
During production, every board undergoes automated provisioning via its native USB-C port connected to a Linux/Windows test fixture:
1. **Silicon Health Check:** Read MAC address, verify 16MB Flash and 8MB PSRAM integrity, read crystal drift.
2. **Firmware & Model Flashing:** Flash production firmware, ESP-SR acoustic model binaries, and LittleFS default game content (Chaos Tower, Who Knows Who, Jeemu Fit).
3. **Cryptographic Key Provisioning:** Generate unique device keypair (ED25519) in secure NVS. Issue signed X.509 device identity certificate.
4. **NFC Batch Calibration:** Sweep RF reader field across an array of 54 blocks and 6 cards. Verify every tag UID responds within $50\text{ ms}$ with RSSI $> -65\text{ dBm}$. Write cryptographic HMAC authentication token to tag memory block 4.
5. **Acoustic & Audio Verification:** The device runs an automated self-test announcing: *"Jeemu Console Initialized. Ready for Stacking."* Test fixture microphone verifies SPL level is between **$72\text{ dBA}$ and $78\text{ dBA}$ @ 0.5 meter distance** with THD $< 2\%$.
6. **Optical Display & LED Check:** Cycle screen through 100% Red, Green, Blue, White, Black to detect dead pixels. Cycle WS2812B LEDs through RGB sweep. Test operator presses pass pedal.

---

## 9. Packaging & Out-of-Box Experience (OOBE)

### 9.1 Packaging Structural Specifications
- **Box Architecture:** Two-piece rigid telescope box with neck tray ($220.0\text{ mm} \times 220.0\text{ mm} \times 85.0\text{ mm}$).
- **Material Specification:**
  - Base & Lid: $1200\text{ gsm}$ heavy greyboard core.
  - Exterior Wrap: $157\text{ gsm}$ FSC-certified coated art paper.
- **Exterior Finishing:**
  - Color: Forest Charcoal matte lamination (`#0C100E`).
  - Graphics: Anti-scratch velvet touch laminate, spot gloss UV varnishing on the Jeemu mascot and console illustrations.
  - Lid Logo: Debossed and stamped with Electric Jade foil (`#00D97E`).
- **Internal Dunnage / Trays:**
  - **Upper Tray:** 100% biodegradable molded sugarcane pulp tray with custom contoured recess for the Smart Baseplate Console, keeping the sloped front face suspended to avoid scuffing.
  - **Lower Tray:** Dual-cavity molded pulp tray holding the 54 wooden blocks in an organized 3×18 grid, a recessed pocket for the 6 NFC cards, and an integrated accessory compartment for the coiled braided USB-C cable.
- **Documentation Envelope:** 300 gsm black kraft sleeve adhered inside the lid containing the Quick Start Guide.

### 9.2 Package Dimensions & Physical Mass
- **Assembled Box Outer Dimensions:** $220.0\text{ mm} \times 220.0\text{ mm} \times 85.0\text{ mm}$ ($0.00411\text{ m}^3$).
- **Component Mass Breakdown:**
  - 54 Hardwood Beech Blocks: **$1,080\text{ g}$** (~$20\text{ g}$ per block).
  - Smart Baseplate Console (with LiPo & PCBA): **$265\text{ g}$**.
  - 6 Plastic NFC Cards: **$32\text{ g}$**.
  - Braided USB-C Cable: **$38\text{ g}$**.
  - Packaging Box, Pulp Trays, and Manual: **$345\text{ g}$**.
- **Total Retail Unit Gross Weight:** **$1,760\text{ g}$ ($1.76\text{ kg}$ / $3.88\text{ lbs}$)**.

---

## 10. Shipping, Logistics & Master Carton Specifications

### 10.1 Master Shipping Carton Specifications
- **Pack Configuration:** **6 Retail Units per Master Shipper Carton** ($1 \times 2 \times 3$ pack arrangement).
- **Master Carton Dimensions:** **$460\text{ mm} \times 460\text{ mm} \times 285\text{ mm}$** ($0.0603\text{ m}^3$).
- **Carton Construction:** Heavy-duty 5-ply double-wall corrugated kraft paper (BC-flute, 250 lbs burst test / 44 ECT edge crush test rating).
- **Carton Tare Weight:** $0.95\text{ kg}$.
- **Master Carton Gross Weight:** **$11.51\text{ kg}$ ($25.37\text{ lbs}$)**.
- **Markings & Drop Labels:** Pre-printed with Fragile, Keep Dry, This Side Up arrows, UN38.3 Lithium Battery Handling Mark, and Master Barcode (ITF-14).

### 10.2 Palletization Layout (Standard US & Euro Pallets)

```
 +-------------------------------------------------------------+
 | PALLET SPECIFICATION: Standard 48" × 40" US Pallet (GMA)    |
 | - Tier Pattern: 4 Master Cartons per Tier                   |
 | - Number of Tiers: 5 Tiers High                             |
 | - Total Master Cartons per Pallet: 20 Cartons (120 Units)   |
 | - Total Pallet Gross Weight: ~245 kg                        |
 | - Maximum Pallet Stack Height: 1.58 meters (including wood) |
 +-------------------------------------------------------------+
```

### 10.3 Customs Classification & Regulatory Shipping Codes
- **Harmonized System (HS) Tariff Codes:**
  - Primary Game System: **HS 9504.90.00** (*Game machines, tabletop games, and interactive gaming equipment*).
  - Wood Component Sub-Classification: **HS 9503.00.35** (*Puzzles and wooden stacking games*).
  - Electronic Component Secondary: **HS 8471.60.90** (*Input/output data units*).
- **Dangerous Goods Classification (LiPo Battery):**
  - Category: **UN 3481**, *Lithium-Ion Batteries Contained in Equipment*.
  - Transport Regulations: Compliant with **IATA Dangerous Goods Regulations (DGR) Section II of Packing Instruction 967 (Air Transport)** and **IMDG Code Special Provision 188 (Ocean Freight)**.
  - Requirement: Watt-hour rating is $4.44\text{ Wh}$ ($< 20\text{ Wh}$ limit per cell), allowing exempt general transport classification provided UN38.3 summary test reports accompany shipment.

---

## 11. Regulatory Compliance & Global Certification Roadmap

To satisfy **global worldwide compliance from day one**, the product is designed and tested against the following mandatory international standards:

```
                             GLOBAL COMPLIANCE MATRIX
 ┌──────────────────────┬──────────────────────┬──────────────────────┐
 │   UNITED STATES      │   EUROPEAN UNION     │    UNITED KINGDOM    │
 │ • FCC Part 15B / 15C │ • CE RED (2014/53/EU)│ • UKCA Radio Regs    │
 │ • UL 2054 / UN 38.3  │ • EN 71-1, 2, 3 Toys │ • EN 71 Equivalents  │
 │ • ASTM F963 Toy Safe │ • RoHS 3 (2015/863)  │ • UK RoHS & WEEE     │
 │ • California Prop 65 │ • WEEE (2012/19/EU)  │                      │
 ├──────────────────────┼──────────────────────┼──────────────────────┤
 │   CANADA             │   JAPAN              │   AUSTRALIA / NZ     │
 │ • ISED ICES-003      │ • TELEC / MIC Radio  │ • RCM Mark           │
 │ • RSS-210 / RSS-247  │ • Japan Toy Standard │ • AS/NZS CISPR 32    │
 └──────────────────────┴──────────────────────┴──────────────────────┘
```

### 11.1 Wireless & Electromagnetic Compatibility (EMC)
- **Modular Grant Inheritance:** By using the pre-certified **ESP32-S3-WROOM-1** module (FCC ID: `2AC7Z-ESPS3WROOM1`, IC: `21098-ESPS3WROOM1`), testing is confined to **Unintentional Radiator Verification (FCC Part 15 Subpart B)** and Collocated Intentional Transmission checks.
- **NFC Transceiver Testing:** FCC Part 15.225 / EN 300 330 testing for 13.56 MHz carrier frequency stability, radiated spurious emissions, and magnetic field strength limits.
- **Electrostatic Discharge (ESD):** IEC 61000-4-2 Level 4 ($\pm 8\text{ kV}$ contact discharge, $\pm 15\text{ kV}$ air discharge across display lens, USB-C shell, and seam edges).

### 11.2 Toy Safety & Chemical Materials Safety
Even though Jeemu is aimed at all ages, because wooden blocks may be handled in households with children, full toy safety compliance is enforced:
- **Mechanical & Physical Safety:** ASTM F963-17 / EN 71-1: Strict avoidance of sharp edges, sharp points, or wood splinters. Pull test on embedded NFC plugs ($> 90\text{ N}$ force).
- **Flammability:** EN 71-2 / 16 CFR 1500.44 testing on wood blocks, plastic housing, and packaging materials.
- **Heavy Metals & Chemical Migration:** EN 71-3 (Migration of 19 toxic elements), RoHS 3 Directive 2015/863/EU (Lead, Cadmium, Mercury, Hexavalent Chromium, PBB, PBDE, Phthalates DEHP, BBP, DBP, DIBP).
- **California Proposition 65:** Zero toxic phthalates or lead content in plasticizers or wax coatings.

---

## 12. Pre-Production Validation & Sample Schedule (Milestones)

The path from tooling kickoff to the **200-unit pilot run** follows a structured 4-phase milestone gateway:

```
[M0: TOOLING KICKOFF] ---> [M1: EVT] ---> [M2: DVT] ---> [M3: PVT] ---> [M4: MASS PRODUCTION]
     Oct 2026                 Nov 2026       Dec 2026       Jan 2027             Feb 2027
   Mold Cut / SMT           10 Prototype    30 Tooling     50 Pilot Run         200-Unit Run
   Stencil Order            Units Bring-Up  Samples (T1)   Process Freeze       Full Delivery
```

| Phase Gate | Sample Qty | Target Schedule | Key Exit Criteria & Quality Verifications |
|---|:---:|:---:|---|
| **EVT (Engineering Validation Test)** | **10 Units** | Weeks 1–3 | • Verify PCBA electrical function, I2S MAX98357A speaker audio levels, and ST25R3916 NFC read sensitivity.<br>• 3D printed / CNC machined shells tested with 2.8" IPS TFT and acrylic lens.<br>• Audio intelligibility: ESP-SR TTS synthetic speech verified at room volume.<br>• First firmware integration passing full turn engine state machine. |
| **DVT (Design Validation Test)** | **30 Units** | Weeks 4–7 | • First-shot molded parts from steel injection molds (T1 samples). Inspect dimensions, weld lines, and surface texture.<br>• Wood block factory batch: verify thickness tolerance ($\pm 0.08\text{ mm}$) and moisture content ($8\%-10\%$).<br>• Environmental stress testing: Thermal cycling ($-10^\circ\text{C}$ to $+55^\circ\text{C}$ for 48 hours).<br>• Drop test: 1.2 meter drop test onto hardwood surface (6 drops per unit). Zero cracking or power loss.<br>• Acoustic chamber vibration inspection (no audible buzzing at peak TTS volume). |
| **PVT (Production Validation Test)** | **50 Units** | Weeks 8–10 | • Run assembly at 100% rated factory line speed with production line operators.<br>• Validate automated FCT bed-of-nails test fixture and USB-C provisioning script.<br>• Packaging drop test: ISTA 1A transit test (10-point drop and vibration table).<br>• Zero line defects across 50 units (Yield $\ge 98\%$). Lock BOM and assembly SOP. |
| **MP (Pilot Commercial Batch)** | **200 Units** | Weeks 11–12 | • Execute full pilot manufacturing run of 200 units.<br>• Final AQL (Acceptable Quality Limit) inspection: Level II Normal, Critical 0, Major 1.0, Minor 2.5.<br>• Palletize into 40 master cartons and prepare for global logistics freight. |

### 12.1 Golden Sample Retention Protocol
Upon successful completion of PVT, exactly **5 Golden Units** will be countersigned and sealed:
- **Golden Sample #1:** Retained at Contract Manufacturer Quality Office (Dongguan/Shenzhen).
- **Golden Sample #2:** Shipped to Client Hardware Engineering Lead (USA).
- **Golden Sample #3:** Retained at Third-Party Inspection Agency (SGS / TÜV SÜD).
- **Golden Sample #4 & #5:** Reserved for Regulatory Testing Laboratories (FCC / CE RED EMC).

---

## 13. Manufacturer Acceptance & Sign-Off

This document constitutes the final engineering, mechanical, electrical, and packaging baseline for the Jeemu Smart Jenga Tabletop Console. Any modifications to materials, tooling geometry, component vendors, or firmware partition structures require an approved **Engineering Change Order (ECO)** signed by both the Client Lead Architect and the Contract Manufacturer Engineering Manager.

**For Jeemu Technologies Inc.:**  
Authorized Signature: ____________________________  
Printed Name: Hardware Architecture Lead  
Date: October 6, 2026  

**For Contract Manufacturer (Turnkey ODM / CM):**  
Authorized Signature: ____________________________  
Printed Name: Director of Manufacturing Engineering  
Date: ________________________  
