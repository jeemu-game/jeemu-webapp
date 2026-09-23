# Jeemu Smart Jenga — Comprehensive Bill of Materials (BOM) & Hardware Architecture

**Revision:** 3.0  
**Target Hardware:** Jeemu Pedestal Smart Base (v3.0) & Physical Game Set  
**Last Updated:** September 2026  

---

## 1. Executive Architectural Evaluation: Is ESP32 the Best Case?

### 1.1 Microcontroller Benchmark Comparison

To determine whether an **Espressif ESP32** is the optimal choice for Jeemu, we evaluated the top four candidate silicon architectures across processing performance, wireless connectivity, peripheral integration (specifically capacitive touch and wide-aspect display driving), power efficiency, and Bill of Materials (BOM) cost.

| Evaluation Metric | Option 1: Espressif ESP32-S3 (Recommended) | Option 2: Nordic nRF52840 | Option 3: Espressif ESP32-C3 / C6 | Option 4: Raspberry Pi RP2040 + Ext. BLE |
|---|---|---|---|---|
| **CPU Architecture** | Dual-core 32-bit Xtensa LX7 @ **240 MHz** (vector instructions) | Single-core ARM Cortex-M4F @ **64 MHz** | Single-core 32-bit RISC-V @ **160 MHz** | Dual-core ARM Cortex-M0+ @ **133 MHz** |
| **Wireless Protocol** | **Bluetooth 5.0 LE** + 2.4 GHz Wi-Fi (802.11 b/g/n) | **Bluetooth 5.3 LE** + Zigbee / Thread (No Wi-Fi) | **BLE 5.0 / 5.3** + Wi-Fi 4 / Wi-Fi 6 | None (Requires external BLE IC e.g. ATWINC / DA14531) |
| **Capacitive Touch** | **14 Native Capacitive Touch GPIOs** (Hardware state machine, zero external IC required) | None (Requires external touch controller IC) | None (Requires external touch controller IC) | None (Requires external touch controller IC) |
| **Display Interface** | High-speed 80 MHz SPI / 8-bit / 16-bit Parallel LCD DMA bus | 8 MHz / 32 MHz SPIM (Frame rate throttled on wide displays) | 40 MHz SPI (Single-core rendering bottlenecks) | Flexible PIO state machines (Requires external driver logic) |
| **Memory** | 512 KB SRAM + **8 MB / 16 MB Octal PSRAM** + 16 MB Flash | 256 KB RAM + 1 MB Flash (No external PSRAM support) | 400 KB SRAM + 4/8 MB Flash (No PSRAM support) | 264 KB SRAM + external SPI Flash |
| **USB Connectivity** | **Native USB-OTG / CDC & JTAG** (Direct firmware flashing without CP2102/CH340) | Native USB 2.0 Full-Speed | USB-Serial/JTAG controller | Native USB 1.1 Host/Device |
| **Deep Sleep Current** | ~20–25 µA (RTC timer + touch wake) | **~1.5–2.5 µA** (World-class sleep efficiency) | ~5 µA | ~180 µA |
| **RF Pre-Certification** | Pre-certified module (FCC, CE, TELEC, KCC, SRRC) | Pre-certified module (FCC, CE, TELEC, Bluetooth SIG) | Pre-certified module | Uncertified (High testing cost) |
| **Module Cost (@ 1k)** | **$2.60** (ESP32-S3-WROOM-1-N16R8) | $3.95 (Raytac MDBT50Q-1MV2) | $1.90 (ESP32-C3-MINI-1) | $1.45 (RP2040 + Flash) + $2.10 (BLE IC) = $3.55 |

### 1.2 Final Selection & Engineering Verdict

**The ESP32-S3 (specifically `ESP32-S3-WROOM-1-N16R8`) is definitively the best-case architecture for Jeemu.**

1. **Zero-Cost Capacitive Touch Integration:** The ESP32-S3 includes 14 internal capacitive sensing channels with hardware noise filtering. By connecting touch pads directly to GPIOs, it completely eliminates external touch ICs (e.g. MPR121, CAP1208, or TTP223), saving **$0.45 to $0.85 per unit** and freeing up board space.
2. **Dedicated Graphic Memory & DMA:** Driving a panoramic **75mm × 25mm bar display (320 × 120 pixels)** with smooth anti-aliased font rendering, animated transitions, and multi-lingual character glyphs requires a double-buffered display pipeline. The 8 MB of high-speed Octal PSRAM provides ample frame buffering without starving system RAM.
3. **Dual-Core Concurrency:** Core 0 runs real-time wireless tasks (sub-second BLE synchronization with the companion mobile app and NFC polling routines), while Core 1 executes local game state machines, audio/buzzer cues, and graphical rendering at 60 FPS.
4. **Direct USB Programming:** Native USB CDC/JTAG allows consumers and developers to update firmware or recover the device over standard USB-C without requiring an auxiliary USB-to-UART bridge IC (such as CH340E or CP2102), saving $0.35 in silicon and reducing PCB footprint.

---

## 2. Subsystem Specifications & Deep-Dive Technical Choices

```
                                  +-------------------------------------------------------+
                                  |                     USB-C PORT                        |
                                  |    (5V Input, CC1/CC2 5.1k Pull-downs, USBLC6 ESD)    |
                                  +---------------------------+---------------------------+
                                                              |
                                                              v
+-------------------------+        +------------------------------------------------------+
| 3.7V 1200mAh LiPo Cell  |<------>|     POWER MANAGEMENT (TI BQ24075 PMIC / Charger)     |
| (PCM Protect: DW01A)    |        |       - Dynamic Power-Path (Play while charging)      |
+-------------------------+        +--------------------------+---------------------------+
                                                              | V_SYS (3.6V - 4.4V)
                                                              v
                                   +------------------------------------------------------+
                                   |           BUCK CONVERTER (Silergy SY8089)            |
                                   |           Delivers Clean 3.3V Rail @ 2.0A Max        |
                                   +--------------------------+---------------------------+
                                                              |
              +-----------------------------------------------+-----------------------------------------------+
              |                                               |                                               |
              v                                               v                                               v
+-----------------------------+               +-------------------------------+               +-------------------------------+
|      ESP32-S3-WROOM-1       |               |    NFC READER (ST25R3916)     |               |    75x25mm BAR DISPLAY        |
|  Dual-core 240MHz, 8MB PSRAM|               |  13.56 MHz ISO 14443A Engine  |               |  2.9" Stretched IPS (320x120) |
|  BLE 5.0 + 2.4GHz Wi-Fi     |<--- SPI Bus ->|  Custom 65x65mm Tuned Antenna |<-- 4-wire SPI-|  ST7789V / NV3030B Controller |
+--------------+--------------+               +---------------+---------------+               +---------------+---------------+
               |                                              |                                               | Backlight PWM
               | Capacitive Touch Lines                       | Tag Field Induction                           v
               v                                              v                               +-------------------------------+
+-----------------------------+               +-------------------------------+               |   DISPLAY BACKLIGHT DRIVER    |
|   3-ZONE CAPACITIVE TOUCH   |               |   54x NTAG213 / NTAG215 TAGS  |               |   AP5724 / SGM3732 Step-Up    |
| Internal Copper Electrodes  |               |  Wood Blocks (75x25x15mm)     |               +-------------------------------+
+-----------------------------+               +-------------------------------+
               |
               +---------------------- Single-Wire RMT Signal ------------------------>+-------------------------------+
                                                                                      | WS2812B-2020 RGB STATUS LED   |
                                                                                      | + Polycarbonate Light Pipe    |
                                                                                      +-------------------------------+
```

### 2.1 Front Display Subsystem (75mm × 25mm Panoramic Viewport)

* **Physical Requirement:** Slanted front face viewport of approximately **$75\text{ mm} \times 25\text{ mm}$**.
* **Display Technology Options Evaluated:**
  1. *2.9-inch Stretched Ultra-Wide IPS TFT LCD (Selected):*
     - **Active Display Area:** $70.08\text{ mm} \times 26.28\text{ mm}$ (Matches $75\times25\text{ mm}$ cutout with minimal 2.5 mm bezel margin).
     - **Module Outer Dimensions:** $78.80\text{ mm} \times 32.50\text{ mm} \times 2.20\text{ mm}$.
     - **Resolution:** $320 \times 120$ pixels (RGB 65K colors).
     - **Driver IC:** Sitronix ST7789V or NewVision NV3030B (Standard SPI / 4-wire interface).
     - **Optical Characteristics:** IPS panel with $178^\circ / 178^\circ$ all-angle viewing, essential for multi-player tabletop gaming where players view the screen from different seating positions. 450 cd/m² luminance ensures readability under bright room lighting.
  2. *2.8-inch Graphic OLED (256×64 pixels, SSD1322) (Alternative):*
     - Active Area: $71.10\text{ mm} \times 17.74\text{ mm}$; Module size: $84.0\text{ mm} \times 25.8\text{ mm}$. Offers pure black background and instant response, but vertical height (17.74 mm) leaves a larger letterbox margin.
  3. *2.9-inch E-Paper Display (296×128 pixels, SSD1680) (Alternative):*
     - Active Area: $66.90\text{ mm} \times 29.10\text{ mm}$. Consumes zero static power, but slow partial refresh rates (300 ms–1000 ms) make dynamic game timer animations and animated block reveals feel sluggish.

### 2.2 NFC Reader Subsystem

* **Operating Frequency:** 13.56 MHz (ISO/IEC 14443 Type A standard).
* **Prototyping Selection:** **NXP PN532 Breakout Module (V3/V4)** with integrated loop antenna, configured over high-speed SPI.
* **Production Selection:** **STMicroelectronics ST25R3916-AQFT** (QFN-32).
  - Delivers up to 1.7 W output power with Dynamic Power Output (DPO).
  - Features high-sensitivity capacitive and inductive low-power wake-up (<15 µA polling), waking the ESP32 only when a physical block enters the near field.
  - Paired with an integrated 2-layer PCB coil antenna ($65\text{ mm} \times 65\text{ mm}$) etched directly onto the carrier PCB top layer beneath the $1.2\text{ mm}$ enclosure ceiling.

### 2.3 Capacitive Touch Subsystem

* **Interface Zones:** 3 distinct virtual buttons: `[Back / Previous]`, `[Action / Confirm]`, `[Skip / Hint]`.
* **Hardware Implementation:** Connected directly to ESP32-S3 capacitive touch pins (`TOUCH1 / GPIO1`, `TOUCH2 / GPIO2`, `TOUCH3 / GPIO3`).
* **Electrode Construction:** Custom copper foil landing pads ($18\text{ mm} \times 8\text{ mm}$, 3M 1181 conductive tape) adhered to the inside surface of the front bezel, separated by 1.0 mm molded isolation ridges to eliminate finger crosstalk.
* **Firmware Filter:** IIR low-pass filter combined with water-rejection calibration implemented in the ESP-IDF touch sensor driver.

### 2.4 Status LED Indicator & Optical Light Pipe

* **Component:** 1× Worldsemi **WS2812B-2020** (2.0 × 2.0 mm SMT) or **SK6812 MINI-3535** addressable RGB LED.
* **Control:** Driven via a single GPIO using the ESP32-S3 RMT (Remote Control) peripheral.
* **Optics:** Injection-molded clear optical Polycarbonate (PC) light pipe ($\varnothing 3.0\text{ mm} \times 8.5\text{ mm}$ length) with a micro-textured diffusing emitter face and a $45^\circ$ internal reflection prism to route light cleanly to the front bezel.
* **Color States:**
  - *Pulsing Cyan/Blue:* BLE awaiting connection.
  - *Solid Soft White:* Idle gameplay ready.
  - *Instant Emerald Green Flash:* Valid block read confirmation.
  - *Amber Pulse:* Timer warning / active countdown.
  - *Red Double Flash:* Block read error or unregistered tag.
  - *Breathing Green:* Battery charging via USB-C.

### 2.5 Power Delivery & Battery Management

* **Rechargeable Battery:** High-capacity 3.7V 1200 mAh Lithium-Polymer pouch cell (Model **LP803048**, dimensions: $48\text{ mm} \times 30\text{ mm} \times 8.0\text{ mm}$). Equipped with an integrated protection circuit module (PCM: DW01A + FS8205A) for overcharge (4.28V), overdischarge (2.80V), and short-circuit protection.
* **PMIC / Charger:** **Texas Instruments BQ24075RGTR** (QFN-16).
  - Standalone linear Li-Ion charger with **Dynamic Power-Path Management (DPPM)**.
  - Allows simultaneous charging and system powering: when plugged into USB-C, the system runs directly from the 5V adapter while charging the battery; if the input current drops, the battery supplements system power seamlessly.
* **System Buck Converter:** **Silergy SY8089AAAC** (SOT-23-5) or **TI TPS62203**.
  - Synchronous step-down DC-DC converter providing **3.3V @ 2.0A continuous** with up to 95% efficiency. Delivers rock-solid voltage stability during 500 mA RF transmit bursts (Wi-Fi/BLE/NFC) that would cause LDOs to brown out.
* **Battery Fuel Gauge:** **Analog Devices / Maxim MAX17048G+T10** (WDFN-8).
  - Uses Maxim ModelGauge™ algorithm to measure state of charge (SoC %) directly from battery voltage without requiring a bulky and lossy current sense resistor. Communicates via I2C.
* **USB-C Interface:** 16-pin USB Type-C receptacle with dual $5.1\text{ k}\Omega$ pull-down resistors on CC1/CC2 lines (guarantees proper 5V power negotiation from any standard USB-PD / USB-C charger) and **STMicroelectronics USBLC6-2SC6** ESD protection diode array.

### 2.6 Enclosure & Mechanical Casing

* **Geometry:** Truncated pedestal pyramid frustum:
  - Top landing platform: $85\text{ mm} \times 85\text{ mm}$ (resting surface for wooden Jenga tower).
  - Base footprint: $115\text{ mm} \times 115\text{ mm} \times 42\text{ mm}$ overall height.
  - Front sloped face ($72^\circ$ incline) containing the $75\text{ mm} \times 25\text{ mm}$ display window and capacitive touch zones.
* **Top Ceiling:** Strict $1.2\text{ mm}$ thickness over the NFC antenna zone for minimal inductive attenuation.
* **Materials:**
  - *Prototype:* High-temp PETG / Tough PLA (3D printed, 0.16mm layer height, 100% infill top deck).
  - *Production:* Injection-molded ABS or PC-ABS blend (2.0 mm nominal wall thickness, matte fine-spark EDM texture).
* **Hardware & Fasteners:**
  - 4× M3 × 16 mm countersunk black oxide socket head screws (DIN 7991).
  - 4× M3 × 4.0 mm (OD 4.2 mm) brass knurled heat-set threaded inserts (heat-staked into base bosses).
  - 4× 3M Bumpon SJ5003 cylindrical silicone rubber feet ($\varnothing 8.0\text{ mm} \times 2.0\text{ mm}$) for tabletop grip and shock absorption during tumbling block collapses.
* **Display Lens:** $78.0\text{ mm} \times 28.0\text{ mm} \times 1.2\text{ mm}$ optical-grade PMMA (acrylic) protective window with anti-scratch coating and perimeter black silk-screen border.

### 2.7 54× NFC Tags & Hardwood Blocks

* **Blocks:** 54 standard hardwood tumbling blocks ($75\text{ mm} \times 25\text{ mm} \times 15\text{ mm}$, FSC-certified European beech or white birch, tumbled and waxed).
* **Transponder IC:** **NXP NTAG213** (144 bytes user memory) or **NTAG215** (504 bytes user memory).
* **Form Factor:** $\varnothing 20\text{ mm}$ circular wet inlays or hard PVC coin tags ($0.85\text{ mm}$ thickness) with high-shear 3M 467MP adhesive backing.
* **Mounting Integration:** Embedded flush into a circular CNC-milled pocket ($\varnothing 20.5\text{ mm} \times 1.0\text{ mm}$ depth) on the end-grain face of each block, sealed with a clear resin topcoat or flush wooden veneer plug to prevent peeling during tumbling tower collapses.

---

## 3. Comprehensive Master Itemized Bill of Materials (BOM)

The table below breaks down all electrical, optical, electromechanical, structural, and packaging components.  
Pricing tiers reflect:
- **1-Off (Prototype / DIY):** Single-piece retail prices from Digi-Key, Mouser, Adafruit, LCSC.
- **100 Units (Maker / Pilot Batch):** Distributor small-pack pricing.
- **1,000 Units (Commercial Mass Production):** Direct factory, reel-quantity, and contract manufacturer pricing.
- **5,000 Units (Scale):** Volume tooling amortized and high-run component sourcing.

| Item # | Ref Des | Component Name | Manufacturer & Part Number (MPN) | Package / Spec | Qty | Unit @ 1 (USD) | Unit @ 100 (USD) | Unit @ 1k (USD) | Unit @ 5k (USD) | Primary Supplier & Procurement Link |
|:---:|---|---|---|---|:---:|:---:|:---:|:---:|:---:|---|
| **1.0** | | **CORE COMPUTING & WIRELESS** | | | | | | | | |
| 1.1 | U1 | ESP32-S3 Wireless Module | Espressif **ESP32-S3-WROOM-1-N16R8** | SMD-41, Dual 240MHz, 16MB Flash, 8MB PSRAM, BLE 5.0 | 1 | $7.90 | $4.20 | $2.60 | $2.25 | [LCSC C2913200](https://www.lcsc.com/product-detail/WiFi-Modules_Espressif-Systems-ESP32-S3-WROOM-1-N16R8_C2913200.html) / [Mouser](https://www.mouser.com/ProductDetail/Espressif-Systems/ESP32-S3-DevKitC-1-N16R8V) |
| 1.2 | X1 | 32.768 kHz RTC Crystal | Epson **FC-135 32.7680KA-AG0** | SMD 3.2×1.5mm, 12.5pF, ±20ppm | 1 | $0.45 | $0.18 | $0.09 | $0.06 | [DigiKey FC-135](https://www.digikey.com/en/products/detail/epson/FC-135-32-7680KA-AG0/154432) / [LCSC C43555](https://www.lcsc.com/) |
| 1.3 | C1,C2 | Crystal Load Capacitors | Murata **GRM1555C1H150JA01D** | 0402, 15pF, 50V, C0G | 2 | $0.10 | $0.02 | $0.005 | $0.003 | [LCSC C1555](https://www.lcsc.com/) |
| **2.0** | | **NFC / RFID SENSING SUBSYSTEM** | | | | | | | | |
| 2.1 | U2 | NFC Transceiver IC | STMicroelectronics **ST25R3916-AQFT** (or NXP PN532 Breakout for Proto) | QFN-32, 13.56 MHz, 1.7W, SPI/I2C | 1 | $8.50 | $3.60 | $1.95 | $1.65 | [Mouser ST25R3916](https://www.mouser.com/ProductDetail/STMicroelectronics/ST25R3916-AQFT) / [Adafruit PN532 #364](https://www.adafruit.com/product/364) |
| 2.2 | X2 | 27.12 MHz NFC Crystal | NDK **NX3225SA-27.120M** | SMD 3225, 27.12MHz, 8pF, ±15ppm | 1 | $0.65 | $0.25 | $0.12 | $0.08 | [DigiKey NX3225SA](https://www.digikey.com/) / [LCSC C84000](https://www.lcsc.com/) |
| 2.3 | L1,L2 | EMC Filter Inductors | Murata **LQH32CN2R2M33L** | 1210, 2.2µH, 790mA | 2 | $0.50 | $0.18 | $0.08 | $0.05 | [DigiKey Murata 2.2uH](https://www.digikey.com/) |
| 2.4 | ANT1 | Tuned 13.56MHz Loop Antenna | Custom 2-Layer Etched PCB Coil ($65\times65\text{ mm}$) | Integrated onto Top Layer Carrier PCB | 1 | Inc. in PCB | Inc. in PCB | Inc. in PCB | Inc. in PCB | Fabricated with Mainboard |
| **3.0** | | **FRONT DISPLAY SUBSYSTEM (75mm × 25mm)** | | | | | | | | |
| 3.1 | DISP1| 2.9" Panoramic Stretched IPS LCD | BuyDisplay / Waveshare **ER-TFT029-1 / ST7789V** | $320\times120$, IPS, 4-wire SPI, Outline: $78.8\times32.5\times2.2\text{ mm}$ | 1 | $7.50 | $4.20 | $2.85 | $2.40 | [BuyDisplay 2.9" Bar LCD](https://www.buydisplay.com/) / [Waveshare Display](https://www.waveshare.com/) |
| 3.2 | J1 | FPC Display Connector | Hirose **FH12-10S-0.5SH(55)** | 10-pin 0.5mm pitch ZIF socket | 1 | $0.60 | $0.22 | $0.11 | $0.07 | [LCSC C263884](https://www.lcsc.com/) / [DigiKey FH12](https://www.digikey.com/) |
| 3.3 | U3 | Backlight Step-Up Driver | SGMICRO **SGM3732YTN6G/TR** | SOT-23-6, 38V Over-voltage, PWM Dimming | 1 | $0.55 | $0.20 | $0.10 | $0.07 | [LCSC C139943](https://www.lcsc.com/) |
| 3.4 | L3 | Power Inductor for Backlight | TDK **VLS252010HBX-100M-1** | SMD 2.5×2.0mm, 10µH, 500mA | 1 | $0.35 | $0.12 | $0.06 | $0.04 | [DigiKey VLS252010](https://www.digikey.com/) |
| 3.5 | W1 | Acrylic Front Lens Window | Custom Optical PMMA Sheet ($78\times28\times1.2\text{ mm}$) | Laser cut, anti-scratch coating, black silk-screen border | 1 | $1.80 | $0.65 | $0.35 | $0.22 | [Ponoko Custom Acrylic](https://www.ponoko.com/) / [Alibaba Lens Factory](https://www.alibaba.com/) |
| **4.0** | | **CAPACITIVE TOUCH SUBSYSTEM** | | | | | | | | |
| 4.1 | TP1-3 | 3-Zone Conductive Electrodes | 3M **1181 Conductive Copper Foil Tape** | 3× $18\times8\text{ mm}$ pads with conductive acrylic adhesive | 3 | $0.30 | $0.10 | $0.04 | $0.02 | [DigiKey 3M 1181 Tape](https://www.digikey.com/en/products/detail/3m/1181-X-1-2/152918) |
| 4.2 | R1-R3 | Touch Series Damping Resistors | Yageo **RC0402JR-07100RL** | 0402, 100Ω, 1%, for EMI suppression | 3 | $0.05 | $0.01 | $0.003 | $0.002 | [LCSC C25076](https://www.lcsc.com/) |
| **5.0** | | **LED STATUS INDICATOR & OPTICS** | | | | | | | | |
| 5.1 | LED1 | Smart Addressable RGB LED | Worldsemi **WS2812B-2020** (or SK6812 MINI) | SMT 2.0×2.0×0.75mm, 5V/3.3V logic, single-wire control | 1 | $0.40 | $0.15 | $0.07 | $0.045 | [LCSC C2843785](https://www.lcsc.com/) / [Adafruit NeoPixel](https://www.adafruit.com/) |
| 5.2 | LP1 | Optical Light Pipe | Bivar **LPR5-0800-0700FP** (or custom molded PC) | Polycarbonate light pipe, $\varnothing 3.0\text{ mm} \times 8.5\text{ mm}$, diffuse tip | 1 | $0.85 | $0.35 | $0.16 | $0.09 | [DigiKey Bivar LPR5](https://www.digikey.com/en/products/detail/bivar-inc/LPR5-0800-0700FP/5169542) |
| **6.0** | | **POWER DELIVERY & BATTERY MANAGEMENT** | | | | | | | | |
| 6.1 | BATT | Rechargeable Li-Polymer Battery | PKCELL / EEMB **LP803048** (with PCM Protection) | 3.7V, 1200mAh, $48\times30\times8\text{ mm}$, JST-PH 2-pin | 1 | $7.50 | $3.80 | $2.40 | $1.95 | [Adafruit 1200mAh #258](https://www.adafruit.com/product/258) / [PKCELL LP803048](https://www.pkcell.com/) |
| 6.2 | U4 | Battery Charger & Power-Path IC | Texas Instruments **BQ24075RGTR** | QFN-16 3×3mm, 1.5A Li-Ion charger, Dynamic Power Path | 1 | $2.10 | $1.35 | $0.82 | $0.68 | [DigiKey BQ24075](https://www.digikey.com/en/products/detail/texas-instruments/BQ24075RGTR/1908244) / [Mouser](https://www.mouser.com/) |
| 6.3 | U5 | Synchronous Buck DC-DC (3.3V) | Silergy **SY8089AAAC** (or TI TPS62203) | SOT-23-5, 2.0A synchronous step-down, 1MHz, 95% eff. | 1 | $0.65 | $0.28 | $0.14 | $0.095 | [LCSC C78989](https://www.lcsc.com/product-detail/DC-DC-Converters_Silergy-Corp-SY8089AAAC_C78989.html) |
| 6.4 | L4 | Buck Inductor | Sunlord **SWPA4030S2R2MT** | SMD 4.0×4.0×3.0mm, 2.2µH, 3.5A, low DCR | 1 | $0.45 | $0.18 | $0.08 | $0.05 | [LCSC C19889](https://www.lcsc.com/) |
| 6.5 | U6 | I2C Battery Fuel Gauge IC | Analog Devices / Maxim **MAX17048G+T10** | TDFN-8 2×2mm, ModelGauge algorithm, I2C SoC monitor | 1 | $1.40 | $0.85 | $0.52 | $0.42 | [DigiKey MAX17048G](https://www.digikey.com/en/products/detail/analog-devices-inc-maxim-integrated/MAX17048G-T10/2651912) |
| 6.6 | D1 | USB-C TVS / ESD Array | STMicroelectronics **USBLC6-2SC6** | SOT-23-6, low capacitance 3.5pF, IEC 61000-4-2 ESD | 1 | $0.35 | $0.12 | $0.05 | $0.03 | [LCSC C7519](https://www.lcsc.com/product-detail/ESD-TVS_STMicroelectronics-USBLC6-2SC6_C7519.html) |
| 6.7 | SW1 | Miniature Power Slide Switch | Shouhan **SS-12D00-G3** (SPDT 1P2T) | 3-pin right angle slide switch, $8.7\times4.3\times4.0\text{ mm}$ | 1 | $0.40 | $0.12 | $0.05 | $0.03 | [LCSC C2844574](https://www.lcsc.com/) / [DigiKey EG1218](https://www.digikey.com/) |
| 6.8 | R4,R5 | USB-C CC1 / CC2 Pull-Downs | Yageo **RC0402FR-075K1L** | 0402, 5.1kΩ, 1%, 1/16W | 2 | $0.05 | $0.01 | $0.002 | $0.001 | [LCSC C25905](https://www.lcsc.com/) |
| **7.0** | | **ENCLOSURE, CASING & HARDWARE** | | | | | | | | |
| 7.1 | CAS1| Pedestal Frustum Pyramid Shell | Injection Molded ABS / PC-ABS (or 3D PETG) | $85\to115\text{ mm}$ frustum, 42mm H, 1.2mm top deck, $75\times25\text{ mm}$ window | 1 | $4.50 | $2.20 | $0.95 | $0.65 | [Weerg Injection Molding](https://www.weerg.com/) / [Protolabs](https://www.protolabs.com/) |
| 7.2 | CAS2| Bottom Base Plate with Bay | Injection Molded ABS / PC-ABS (or 3D PETG) | $114\times114\times4\text{ mm}$, battery retaining rails, USB cutout | 1 | $2.50 | $1.20 | $0.55 | $0.38 | Tooling amortized in production |
| 7.3 | SC1-4| Countersunk Machine Screws | Bossard / McMaster **DIN 7991 M3 × 16 mm** | SUS304 black oxide hex socket flat countersunk screw | 4 | $0.60 | $0.16 | $0.06 | $0.04 | [McMaster-Carr 91294A198](https://www.mcmaster.com/91294A198/) / [Bolt Depot](https://www.boltdepot.com/) |
| 7.4 | INS1-4| Brass Heat-Set Threaded Inserts | CNC Kitchen / McMaster **M3 × 4.0 mm (OD 4.2 mm)** | Knurled standard brass insert for thermal plastic staking | 4 | $0.80 | $0.24 | $0.08 | $0.05 | [McMaster 94180A331](https://www.mcmaster.com/94180A331/) / [CNC Kitchen M3](https://cnckitchen.store/) |
| 7.5 | FT1-4| Anti-Slip Rubber Feet Bumpers | 3M **Bumpon SJ5003-BLACK** | Cylindrical silicone rubber, $\varnothing 8.0\text{ mm} \times 2.0\text{ mm}$ | 4 | $0.80 | $0.28 | $0.12 | $0.08 | [DigiKey 3M SJ5003](https://www.digikey.com/en/products/detail/3m/SJ5003-BLACK/154421) |
| **8.0** | | **INTERCONNECTS, PCB & CABLING** | | | | | | | | |
| 8.1 | J2 | USB Type-C Receptacle | Korean HRO **TYPE-C-31-M-12** (or Molex 105450) | 16-pin USB 2.0 Type-C SMD/Through-hole hybrid, 5A | 1 | $0.85 | $0.32 | $0.15 | $0.09 | [LCSC C165948](https://www.lcsc.com/product-detail/USB-Connectors_Korean-Hroparts-Elec-TYPE-C-31-M-12_C165948.html) |
| 8.2 | J3 | Battery Polarized Header | JST Sales America **B2B-PH-K-S(LF)(SN)** | 2.0mm pitch 2-pin through-hole right-angle header | 1 | $0.35 | $0.12 | $0.05 | $0.03 | [DigiKey JST-PH 2-Pin](https://www.digikey.com/en/products/detail/jst-sales-america-inc/B2B-PH-K-S-LF-SN/926611) |
| 8.3 | PCB1 | Mainboard Carrier PCB | Custom 4-Layer FR-4 PCB ($90\times90\text{ mm}$) | 1.2mm thickness, ENIG gold finish, matte black mask | 1 | $3.50 | $1.40 | $0.75 | $0.52 | [JLCPCB SMT Service](https://jlcpcb.com/) / [PCBWay](https://www.pcbway.com/) |
| 8.4 | PASS | SMD Resistors/Capacitors Block | Yageo / Samsung 0402 / 0603 MLCC & Thick Film | Decoupling caps (0.1µF, 1µF, 10µF, 22µF) & pull-ups | 28 | $0.70 | $0.25 | $0.10 | $0.06 | Assembled via Turnkey SMT |
| **9.0** | | **GAME ELEMENTS: 54× NFC TAGS & WOOD BLOCKS** | | | | | | | | |
| 9.1 | TAG1-54| High-Frequency NFC Transponders | NXP **NTAG213 / NTAG215** Wet Inlays / Coin Tags | 13.56 MHz ISO 14443A, $\varnothing 20\text{ mm}$, 3M 467MP adhesive | 54 | $8.10 ($0.15/ea) | $4.32 ($0.08/ea) | $2.43 ($0.045/ea) | $1.89 ($0.035/ea) | [ShopNFC NTAG213](https://www.shopnfc.com/en/nfc-stickers/15-nfc-stickers-ntag213-white.html) / [Alibaba NFC Factory](https://www.alibaba.com/) |
| 9.2 | BLK1-54| FSC Hardwood Tumbling Blocks | Custom Milled European Beech / White Birch | 54 blocks ($75\times25\times15\text{ mm}$), CNC recessed end mortise | 54 | $10.00 | $5.50 | $3.50 | $2.80 | [Amazon Tumbling Tower 54pc](https://www.amazon.com/) / [Alibaba FSC Wood Maker](https://www.alibaba.com/) |
| **10.0**| | **PACKAGING & ACCESSORIES** | | | | | | | | |
| 10.1 | CBL | Braided USB-C to USB-A Cable | Standard 1.0 m USB 2.0 Braided Charge Cable | 24 AWG power, molded strain reliefs | 1 | $1.50 | $0.75 | $0.42 | $0.32 | [CableCreation USB-C](https://www.cablecreation.com/) / [Alibaba Cable](https://www.alibaba.com/) |
| 10.2 | BOX | Custom Retail Rigid Gift Box | Heavy Kraft Cardboard + Custom Molded Pulp Insert | Matte laminate, spot UV graphics, game tray compartment | 1 | $3.50 | $1.80 | $0.95 | $0.68 | [Packlane Custom Boxes](https://packlane.com/) / [Alibaba Packaging](https://www.alibaba.com/) |
| 10.3 | QSG | Quick-Start Card & Safety Manual | 4-Panel Accordion Fold Card (300 gsm paper) | Full color soy ink printing | 1 | $0.50 | $0.20 | $0.08 | $0.05 | Local offset printing / Packlane |
| | | **TOTAL BOM COST PER UNIT** | | | | **$70.95** | **$38.74** | **$23.36** | **$18.66** | |

---

## 4. Power Budget & Battery Longevity Analysis

The system operates off a single **3.7V nominal, 1200 mAh (4.44 Wh)** Li-Po cell. The power profiles across different game operating states are detailed below:

| System State | Active Components & Operational Profile | Average Current Draw @ 3.3V | Equivalent Battery Current @ 3.7V (92% Buck Eff.) | Estimated Runtime (1200 mAh Cell) |
|---|---|:---:|:---:|:---:|
| **Continuous Active Play** | ESP32 dual-core active (160MHz) + BLE connected + Display Backlight at 75% + Continuous NFC Polling (10 Hz) | **145 mA** | **140 mA** | **~8.5 Hours** |
| **Casual Turn-Based Play** | ESP32 throttled to 80MHz + BLE idle + Display Backlight dimmed to 40% + NFC Polling burst (200ms every 1s) | **58 mA** | **56 mA** | **~21.4 Hours** |
| **Attract / Standby Mode** | Display Backlight sleep + BLE advertising beacon (100ms interval) + NFC low-power capacitive field sniff | **18 mA** | **17.5 mA** | **~68 Hours (~2.8 Days)** |
| **Deep Sleep Mode** | ESP32 RTC domain active only + Capacitive touch pin wake enabled + PMIC battery monitoring | **28 µA** | **31 µA** | **>4.4 Years** (Limited by cell self-discharge) |

---

## 5. Production Tooling & Non-Recurring Engineering (NRE) Costs

Transitioning from rapid prototyping (FDM 3D printing and manual modular wiring) to high-volume manufacturing (DFM injection molding and turnkey SMT surface-mount assembly) requires the following one-time investments:

| Tooling / Engineering Category | Scope & Specifications | Estimated NRE Cost | Amortized Cost @ 1,000 Units | Amortized Cost @ 5,000 Units |
|---|---|:---:|:---:|:---:|
| **Steel Injection Molds** | 2-Cavity P20 / NAK80 hardened steel tooling for Pyramid Shell, Base Plate, and Acrylic Lens Frame | $5,500 – $7,500 | $6.50 / unit | $1.30 / unit |
| **SMT Stencils & PCBA Setup** | Laser-cut stainless steel solder paste stencils + automated pick-and-place feeder setup at JLCPCB / PCBWay | $250 – $400 | $0.32 / unit | $0.06 / unit |
| **Wood Block CNC Mortising Jig** | Custom multi-head router fixture to mill $\varnothing 20.5\text{ mm} \times 1.0\text{ mm}$ end-grain pockets in 54 blocks simultaneously | $450 – $700 | $0.55 / unit | $0.11 / unit |
| **EMC / RF Pre-Compliance Testing** | Intentional radiator FCC Part 15C / CE RED pre-scans (13.56MHz NFC + 2.4GHz BLE) in anechoic chamber | $2,200 – $3,200 | $2.70 / unit | $0.54 / unit |
| **TOTAL ONE-TIME NRE** | | **$8,400 – $11,800** | **~$10.07 / unit** | **~$2.01 / unit** |

---

## 6. Manufacturing, Assembly & Sourcing Recommendations

1. **Leverage Pre-Certified Modules for Regulatory Immunity:**
   Using the **ESP32-S3-WROOM-1** module allows Jeemu to inherit Espressif's existing FCC/CE/TELEC modular grants (FCC ID: `2AC7Z-ESPS3WROOM1`). This avoids full intentional radiator certification costs ($15,000+) and restricts mandatory laboratory testing to unintentional radiator verification (~$2,500).
2. **Dynamic Power-Path Management (TI BQ24075):**
   Unlike basic TP4056 linear charger modules that leave the battery connected directly to the system load (preventing proper termination current sensing and causing battery overheating), the BQ24075 dynamically isolates the Li-Po battery when external USB-C power is detected. This allows players to host infinite-duration party sessions while plugged in without degrading battery cycle life.
3. **Display Ribbon Routing & Strain Relief:**
   The $75\times25\text{ mm}$ stretched bar LCD features a bottom-exit flexible printed circuit (FPC). Route the FPC through an integrated relief channel in the internal carrier sled to prevent the flex cable from crimping against the Li-Po battery cradle during assembly.
4. **NTAG213 vs NTAG215 Selection:**
   Standard Jeemu gameplay encodes a compact 16-byte payload containing the block index, category ID, and a 64-bit cryptographic HMAC signature (`jeemu://b/01?s=9f8a...`). The **NTAG213 (144 bytes user memory)** is more than sufficient and saves $0.03 per tag ($1.62 per 54-block set) compared to the NTAG215 (504 bytes), which is only required if offline game text prompts are written directly into the block transponders.
