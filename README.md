# Daggerheart Compact Sheets

Compact sheet module for Foundry VTT 13/14 and the Foundryborne Daggerheart system.

## Highlights

- Compact paper-card layouts focused on fast table readability
- Quick pip controls for hit points and stress
- Keeps the system item/effect partials, so core sheet actions still work
- Clean module structure with shared constants and context builders

## Structure

- `scripts/main.js` - module bootstrap, settings, and sheet registration
- `scripts/constants.js` - shared ids, paths, and config
- `scripts/utils.js` - compact-context builders and data normalization helpers
- `scripts/compact-adversary-sheet.js` - compact sheet subclass
- `scripts/compact-environment-sheet.js` - compact environment sheet subclass
- `styles/compact-sheets.css` - shared compact sheet styles
