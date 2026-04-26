# Daggerheart Compact Sheets

Compact sheet module for Foundry VTT 13/14 and the Foundryborne Daggerheart system.

## Installation

1. Copy https://github.com/Oxy949/daggerheart-compact-sheets/releases/latest/download/module.json
2. Paste it in your Foundry VTT, wait for install
3. Enable the module in your world
4. Enjoy!


## Highlights

- Compact paper-card layouts focused on fast table readability
- Compact adversary, minimal adversary, environment, and character actor sheets
- Quick pip controls for hit points, stress, hope, and armor slots
- Keeps the system item/effect partials, so core sheet actions still work
- Clean module structure with shared constants and context builders

## Structure

- `scripts/main.js` - module bootstrap, settings, and sheet registration
- `scripts/constants.js` - shared ids, paths, and config
- `scripts/compact-sheet-helpers.js` - shared sheet class helpers and render bindings
- `scripts/utils.js` - compact-context builders and data normalization helpers
- `scripts/compact-adversary-sheet.js` - compact sheet subclass
- `scripts/minimal-adversary-sheet.js` - minimal stat-block adversary sheet subclass
- `scripts/compact-character-sheet.js` - compact character sheet subclass
- `scripts/compact-environment-sheet.js` - compact environment sheet subclass
- `styles/compact-*.css` - compact sheet tokens, layout, panels, and actor-specific styles
