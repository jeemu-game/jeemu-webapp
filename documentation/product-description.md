# Jeemu - Customizable Smart Jenga

## 1. Product Overview

Jeemu is a customizable Jenga-based game system that combines NFC-enabled physical blocks, a dedicated game device, and a mobile application.

Every Jeemu block contains an NFC tag with a unique identity. During a game, a player places a removed block on the designated NFC reading area integrated into the Jeemu Jenga box. The device identifies the block and displays the content associated with that block for the current game configuration.

The same physical block can have different content in different games. Users can customize and change the content through the Jeemu mobile application after each game, allowing the same physical set to support different experiences and keep gameplay varied.

The mobile application is used for customization and content management, while the physical Jeemu device operates independently during gameplay. Once a configuration has been transferred to the device, players do not need to use a phone or any other external device while playing.

Jeemu will initially focus on seven experience categories and will support a marketplace through which additional game modes and content packs can be created, shared, and accessed.

---

# 2. Product Components

## 2.1 NFC-Enabled Jenga Blocks

The current Jeemu base set contains **45 Jenga blocks**.

Each block contains an NFC tag and has a unique identity.

The blocks currently use standard Jenga sizing.

An **extension set containing 9 additional NFC-enabled blocks** is also planned.

The NFC identity of a block remains associated with that physical block, while the content associated with that block can change from one game configuration to another.

This means the same physical block can represent different questions, challenges, actions, or other text-based content depending on the selected game.

---

# 3. Jeemu Jenga Box

The Jeemu Jenga box is used to hold and restack the blocks.

The box also contains the location used to read the NFC tags from the blocks.

The current concept is that after a player removes a block, the block is placed or tapped in the designated area of the Jenga box, allowing the Jeemu device to identify it and display the relevant content.

The exact physical design and interaction mechanism for placing/tapping the block on the reading area are still being developed.

---

# 4. Jeemu Game Device

The Jeemu hardware contains:

* An NFC reader
* A display
* Physical buttons
* Game logic
* Bluetooth connectivity
* An attachment capable of providing additional functionality

The physical device operates the game independently after a game configuration has been transferred to it.

The buttons are currently intended to support selection of configurations and related device interactions.

The device does not require the mobile application, a phone, or another external device during gameplay.

The exact functionality of the attachment is still being defined.

---

# 5. Gameplay

The intended gameplay flow is:

1. Players select or configure a game.
2. The selected configuration is transferred from the mobile application to the Jeemu device.
3. The players begin playing using only the physical Jeemu set.
4. A player removes a Jenga block.
5. The player places/taps the block on the NFC reading area on the Jeemu box.
6. Jeemu identifies the block.
7. The device displays the content assigned to that block in the current game configuration.
8. Players act according to the displayed content and continue the game.

The current game system does **not** track player turns, scores, winners, or other player-specific game state.

Jeemu also does not currently define traditional game rules. Instead, customization can determine the type of content and potential actions associated with different blocks.

---

# 6. Content System

The content displayed by Jeemu is not restricted to a specific content type.

Users can create text-based content including, for example:

* Questions
* Challenges
* Instructions
* Actions
* Rewards
* Penalties
* Other custom text defined by the user

The content displayed for a block can change between games.

For example, the same physical block could display:

> "Solve this math problem."

in one game and:

> "Choose another player to take a drink."

in another game.

The physical block therefore acts as a reusable trigger for digital content rather than having a permanently fixed question or action.

---

# 7. Difficulty and Rewards

The customization system can associate different content with different physical blocks.

Users can use the physical characteristics or perceived difficulty of individual blocks to create different experiences.

For example, users could configure harder-to-remove blocks to carry greater rewards or more difficult questions, while easier blocks could carry different challenges.

The system therefore allows the relationship between **physical gameplay difficulty and digital content** to be customized.

Jeemu does not currently prescribe a fixed difficulty system; the configuration is determined by the user.

---

# 8. Mobile Application

The Jeemu mobile application is primarily a customization and content-management tool.

The app requires:

* Internet connectivity
* Bluetooth connectivity

The app allows users to:

* Create games from scratch
* Customize questions and other content
* Configure game experiences
* Save configurations
* Edit configurations
* Customize content after each game
* Transfer configurations to the physical Jeemu device
* Access content from the marketplace
* Pull marketplace content into their own game configurations
* Share configurations through the marketplace

The application is **not required during gameplay**.

Once the configuration has been transferred to Jeemu, the physical device can run the game independently.

Users can also use predefined Jeemu presets without creating a custom configuration.

---

# 9. AI-Assisted Game Creation

The Jeemu application includes an AI-assisted content creation capability.

Rather than only generating individual questions, the AI is intended to help users create a complete game configuration.

The AI can help generate:

### Content

A complete set of questions, challenges, instructions, or other text content based on the user's requested theme or requirements.

### Game mechanics

The AI can also help create custom gameplay instructions or mechanics.

Examples provided include:

* Random drinks
* Tag-team mechanics
* Blindfold challenges
* Rolling dice and selecting additional actions
* Other custom gameplay mechanics

The intended workflow is:

**User provides instructions → AI generates a draft game → user reviews and edits the draft → user approves the configuration → configuration is transferred to Jeemu.**

The AI therefore acts as an assisted game-creation tool rather than automatically publishing or deploying generated content without user review.

---

# 10. Presets

Users can use predefined Jeemu game configurations without creating their own games.

Presets provide an immediately playable experience and reduce the need for users to configure content manually.

The exact number and contents of the initial presets are still being defined.

---

# 11. Initial Game Categories

Jeemu will initially focus on seven potential experience categories:

### Drinking Games

Games involving drinking-related questions, challenges, rewards, or actions.

### Fitness Games

Physical activities, exercises, and fitness-related challenges.

### Math Puzzles for Kids

Mathematical questions, puzzles, and problem-solving activities designed for children.

### Workshops

Interactive prompts, activities, challenges, and mechanics that can be used as part of workshops.

### Ice-Breakers

Questions, activities, and interactions designed to help groups interact and get to know each other.

### Weddings

Wedding-specific questions, challenges, interactions, and activities.

### Cafe Experiences

Interactive experiences that can be deployed by cafés for their customers.

These categories represent the initial product direction. They are not necessarily separate hardware products.

---

# 12. Game Modes and Content Packs

The Jeemu ecosystem will distinguish between the physical product and its digital experiences.

A game mode or content pack can define the content and/or gameplay experience delivered through the physical Jeemu hardware.

The same physical Jeemu set can therefore support multiple game modes and content packs.

A user can change the configuration between games rather than requiring different physical blocks for every experience.

---

# 13. Marketplace

Jeemu will include a marketplace for game experiences and content.

The initial marketplace will contain content created by Jeemu.

Subsequently, users will be able to create and publish their own content for the marketplace.

Marketplace content may include:

* Complete game modes
* Content packs
* Questions
* Challenges
* Rules/mechanics
* Other supported game content

Users will be able to access marketplace content and incorporate it into their Jeemu experience.

The marketplace is intended to follow a **freemium model**.

The exact distinction between free and paid marketplace content is still to be defined.

---

# 14. User-Created Content

User-generated content is a core part of the longer-term Jeemu ecosystem.

A user can create a game configuration, customize it, save it, and potentially make it available through the marketplace.

This allows the physical Jeemu hardware to remain the same while the available game experiences continually expand.

---

# 15. Primary and Secondary Users

### Primary

Jeemu is primarily designed for individual consumers.

The core experience is centered around people purchasing and using the physical product for their own games and social experiences.

### Secondary

Businesses and cafés represent a secondary application.

A café or business can purchase Jeemu hardware and use the mobile application to configure the device for customer-facing experiences.

The specific commercial workflows for businesses have not yet been defined.

---

# 16. Potential Applications

The current product architecture is designed to support applications across several environments, including:

**Home and social environments**
Drinking games, ice-breakers and other group experiences.

**Family and children's experiences**
Math puzzles and other educational activities.

**Fitness environments**
Fitness and activity-based games.

**Professional environments**
Workshops and ice-breaker activities.

**Events**
Wedding-specific experiences.

**Hospitality**
Café and customer-engagement experiences.

These are potential applications that the platform is equipped to support, rather than a commitment that all of them will be launched simultaneously.

---

# 17. Core Product Architecture

At a conceptual level, Jeemu consists of three connected layers:

### Physical Layer

**NFC-enabled Jenga blocks + Jeemu Jenga box/device**

The blocks provide physical gameplay and unique NFC identities.

### Configuration Layer

**Jeemu Mobile Application**

The app creates, edits, stores, discovers, and transfers game configurations.

### Content Layer

**Jeemu Presets + AI-generated games + Marketplace**

This provides the experiences and content that can be assigned to the physical blocks.

The relationship is:

**Game/content configuration**
→ **assigned to NFC block identities**
→ **transferred to Jeemu**
→ **block is read**
→ **configured content is displayed**

---

# 18. Core Product Proposition

The current concept can be summarized as:

> **Jeemu turns a physical Jenga set into a customizable game platform. Every block has an NFC identity, allowing the same physical block to trigger different questions, challenges, instructions, rewards, or other content depending on the selected game configuration. Users customize or create games through the Jeemu app, optionally using AI to generate complete game experiences, and transfer the configuration to the physical device. Once configured, Jeemu operates independently during gameplay without requiring a phone. The platform launches with seven initial experience categories and can expand through a freemium marketplace of Jeemu-created and user-created game modes and content packs.**
