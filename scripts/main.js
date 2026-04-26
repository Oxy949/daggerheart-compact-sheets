import { createCompactAdversarySheetClass } from "./compact-adversary-sheet.js";
import { createCompactCharacterSheetClass } from "./compact-character-sheet.js";
import { createCompactEnvironmentSheetClass } from "./compact-environment-sheet.js";
import { createMinimalAdversarySheetClass } from "./minimal-adversary-sheet.js";
import {
  MODULE_ID,
  PRELOAD_TEMPLATE_PATHS,
  SETTING_KEYS,
  SHEET_LABELS,
  SYSTEM_ID
} from "./constants.js";

Hooks.once("init", async () => {
  registerSettings();
  await preloadTemplates();
});

Hooks.once("setup", () => {
  if (game.system.id !== SYSTEM_ID) return;
  registerCompactSheets();
});

function registerSettings() {
  game.settings.register(MODULE_ID, SETTING_KEYS.makeAdversaryDefault, {
    name: "DHCS.Settings.MakeAdversaryDefault.Name",
    hint: "DHCS.Settings.MakeAdversaryDefault.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.makeEnvironmentDefault, {
    name: "DHCS.Settings.MakeEnvironmentDefault.Name",
    hint: "DHCS.Settings.MakeEnvironmentDefault.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.makeCharacterDefault, {
    name: "DHCS.Settings.MakeCharacterDefault.Name",
    hint: "DHCS.Settings.MakeCharacterDefault.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });
}

async function preloadTemplates() {
  await foundry.applications.handlebars.loadTemplates(PRELOAD_TEMPLATE_PATHS);
}

function registerCompactSheets() {
  const actorSheets = game.system.api?.applications?.sheets?.actors;

  registerCompactSheet({
    baseSheet: actorSheets?.Adversary,
    factory: createCompactAdversarySheetClass,
    label: SHEET_LABELS.adversary,
    makeDefault: game.settings.get(MODULE_ID, SETTING_KEYS.makeAdversaryDefault),
    type: "adversary"
  });

  registerCompactSheet({
    baseSheet: actorSheets?.Adversary,
    factory: createMinimalAdversarySheetClass,
    label: SHEET_LABELS.minimalAdversary,
    makeDefault: false,
    type: "adversary"
  });

  registerCompactSheet({
    baseSheet: actorSheets?.Environment,
    factory: createCompactEnvironmentSheetClass,
    label: SHEET_LABELS.environment,
    makeDefault: game.settings.get(MODULE_ID, SETTING_KEYS.makeEnvironmentDefault),
    type: "environment"
  });

  registerCompactSheet({
    baseSheet: actorSheets?.Character,
    factory: createCompactCharacterSheetClass,
    label: SHEET_LABELS.character,
    makeDefault: game.settings.get(MODULE_ID, SETTING_KEYS.makeCharacterDefault),
    type: "character"
  });
}

function registerCompactSheet({ baseSheet, factory, label, makeDefault, type }) {
  if (!baseSheet) {
    console.warn(`${MODULE_ID} | Daggerheart ${type} sheet class was not found. Registration skipped.`);
    return;
  }

  const CompactSheet = factory(baseSheet);

  foundry.documents.collections.Actors.registerSheet(MODULE_ID, CompactSheet, {
    types: [type],
    makeDefault,
    label
  });
}
