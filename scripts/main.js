import { createCompactAdversarySheetClass } from "./compact-adversary-sheet.js";
import { createCompactEnvironmentSheetClass } from "./compact-environment-sheet.js";
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

  game.settings.register(MODULE_ID, SETTING_KEYS.showAdversaryInteractionButtons, {
    name: "DHCS.Settings.ShowAdversaryInteractionButtons.Name",
    hint: "DHCS.Settings.ShowAdversaryInteractionButtons.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: rerenderOpenCompactAdversarySheets
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.showAdversaryResourceBlock, {
    name: "DHCS.Settings.ShowAdversaryResourceBlock.Name",
    hint: "DHCS.Settings.ShowAdversaryResourceBlock.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: rerenderOpenCompactAdversarySheets
  });
}

function rerenderOpenCompactAdversarySheets() {
  const applications = new Set([
    ...Object.values(ui.windows ?? {}),
    ...getApplicationInstances()
  ]);

  for (const application of applications) {
    if (application?.document?.type !== "adversary") continue;

    const element = application.element instanceof HTMLElement
      ? application.element
      : application.element?.[0];

    if (!element?.classList?.contains("dh-compact")) continue;

    application.render?.({ force: true });
  }
}

function getApplicationInstances() {
  const instances = foundry.applications?.instances;
  if (instances instanceof Map) return instances.values();
  return Object.values(instances ?? {});
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
    baseSheet: actorSheets?.Environment,
    factory: createCompactEnvironmentSheetClass,
    label: SHEET_LABELS.environment,
    makeDefault: game.settings.get(MODULE_ID, SETTING_KEYS.makeEnvironmentDefault),
    type: "environment"
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
