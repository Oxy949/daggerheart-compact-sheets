export const MODULE_ID = "daggerheart-compact-sheets";
export const SYSTEM_ID = "daggerheart";
export const SHEET_LABELS = Object.freeze({
  adversary: "Compact Adversary Sheet",
  character: "Compact Character Sheet",
  environment: "Compact Environment Sheet"
});

export const SETTING_KEYS = Object.freeze({
  makeAdversaryDefault: "makeAdversaryDefault",
  makeCharacterDefault: "makeCharacterDefault",
  makeEnvironmentDefault: "makeEnvironmentDefault"
});

export const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates`;

export const SHARED_TEMPLATE_PARTIALS = Object.freeze({
  art: `${TEMPLATE_ROOT}/parts/art.hbs`,
  effects: `${TEMPLATE_ROOT}/parts/effects.hbs`,
  features: `${TEMPLATE_ROOT}/parts/features.hbs`,
  notes: `${TEMPLATE_ROOT}/parts/notes.hbs`,
  tabNav: `${TEMPLATE_ROOT}/parts/tab-nav.hbs`
});

export const ADVERSARY_TEMPLATE_PARTIALS = Object.freeze({
  art: SHARED_TEMPLATE_PARTIALS.art,
  header: `${TEMPLATE_ROOT}/parts/header.hbs`,
  footer: `${TEMPLATE_ROOT}/parts/footer.hbs`,
  features: SHARED_TEMPLATE_PARTIALS.features,
  effects: SHARED_TEMPLATE_PARTIALS.effects,
  notes: SHARED_TEMPLATE_PARTIALS.notes,
  tabNav: SHARED_TEMPLATE_PARTIALS.tabNav
});

export const ENVIRONMENT_TEMPLATE_PARTIALS = Object.freeze({
  art: SHARED_TEMPLATE_PARTIALS.art,
  header: `${TEMPLATE_ROOT}/environment/parts/header.hbs`,
  features: SHARED_TEMPLATE_PARTIALS.features,
  potentialAdversaries: `${TEMPLATE_ROOT}/environment/parts/potential-adversaries.hbs`,
  notes: SHARED_TEMPLATE_PARTIALS.notes,
  tabNav: SHARED_TEMPLATE_PARTIALS.tabNav
});

export const CHARACTER_TEMPLATE_PARTIALS = Object.freeze({
  art: SHARED_TEMPLATE_PARTIALS.art,
  header: `${TEMPLATE_ROOT}/character/parts/header.hbs`,
  footer: `${TEMPLATE_ROOT}/character/parts/footer.hbs`,
  features: `${TEMPLATE_ROOT}/character/parts/features.hbs`,
  loadout: `${TEMPLATE_ROOT}/character/parts/loadout.hbs`,
  inventory: `${TEMPLATE_ROOT}/character/parts/inventory.hbs`,
  biography: `${TEMPLATE_ROOT}/character/parts/biography.hbs`,
  effects: SHARED_TEMPLATE_PARTIALS.effects,
  tabNav: SHARED_TEMPLATE_PARTIALS.tabNav
});

export const PRELOAD_TEMPLATE_PATHS = Object.freeze(
  Array.from(new Set([
    ...Object.values(ADVERSARY_TEMPLATE_PARTIALS),
    ...Object.values(CHARACTER_TEMPLATE_PARTIALS),
    ...Object.values(ENVIRONMENT_TEMPLATE_PARTIALS)
  ]))
);

export const DEFAULT_WINDOWS = Object.freeze({
  adversary: Object.freeze({
    width: 345,
    height: "auto"
  }),
  character: Object.freeze({
    width: 430,
    height: "auto"
  }),
  environment: Object.freeze({
    width: 345,
    height: "auto"
  })
});

export const FEATURE_DESCRIPTION_SELECTOR = ".dhca-tab-panel--features .inventory-item .extensible";
export const ART_EDIT_SELECTOR = ".dhca-header__art-edit";
export const RESOURCE_ROW_SELECTOR = ".dhca-resource-row:not(.dhca-resource-row--fallback)";
export const RESOURCE_STEP_SELECTOR = ".dhca-resource-step";
export const SCROLLABLE_PANEL_SELECTOR = ".dhca-tab-panel__scroll";
export const RESOURCE_GROUP_SIZE = 3;

export const RESOURCE_KEYS = Object.freeze({
  armorScore: "armorScore",
  hitPoints: "hitPoints",
  hope: "hope",
  stress: "stress"
});

export const RESOURCE_ACTIONS = Object.freeze({
  [RESOURCE_KEYS.armorScore]: "toggleArmor",
  [RESOURCE_KEYS.hitPoints]: "toggleHitPoints",
  [RESOURCE_KEYS.hope]: "toggleHope",
  [RESOURCE_KEYS.stress]: "toggleStress"
});

export const I18N_KEYS = Object.freeze({
  tier: "DAGGERHEART.GENERAL.tier"
});
