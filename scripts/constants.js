export const MODULE_ID = "daggerheart-compact-sheets";
export const SYSTEM_ID = "daggerheart";
export const SHEET_LABELS = Object.freeze({
  adversary: "Compact Adversary Sheet",
  environment: "Compact Environment Sheet"
});

export const SETTING_KEYS = Object.freeze({
  makeAdversaryDefault: "makeAdversaryDefault",
  makeEnvironmentDefault: "makeEnvironmentDefault"
});

export const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates`;

export const ADVERSARY_TEMPLATE_PARTIALS = Object.freeze({
  art: `${TEMPLATE_ROOT}/parts/art.hbs`,
  header: `${TEMPLATE_ROOT}/parts/header.hbs`,
  footer: `${TEMPLATE_ROOT}/parts/footer.hbs`,
  features: `${TEMPLATE_ROOT}/parts/features.hbs`,
  effects: `${TEMPLATE_ROOT}/parts/effects.hbs`,
  notes: `${TEMPLATE_ROOT}/parts/notes.hbs`
});

export const ENVIRONMENT_TEMPLATE_PARTIALS = Object.freeze({
  art: `${TEMPLATE_ROOT}/parts/art.hbs`,
  header: `${TEMPLATE_ROOT}/environment/parts/header.hbs`,
  features: `${TEMPLATE_ROOT}/environment/parts/features.hbs`,
  potentialAdversaries: `${TEMPLATE_ROOT}/environment/parts/potential-adversaries.hbs`,
  notes: `${TEMPLATE_ROOT}/environment/parts/notes.hbs`
});

export const PRELOAD_TEMPLATE_PATHS = Object.freeze([
  ...Object.values(ADVERSARY_TEMPLATE_PARTIALS),
  ...Object.values(ENVIRONMENT_TEMPLATE_PARTIALS)
]);

export const DEFAULT_WINDOWS = Object.freeze({
  adversary: Object.freeze({
    width: 345,
    height: "auto"
  }),
  environment: Object.freeze({
    width: 345,
    height: "auto"
  })
});

export const FEATURE_DESCRIPTION_SELECTOR = ".dhca-tab-panel--features .inventory-item .extensible";
export const RESOURCE_STEP_SELECTOR = ".dhca-resource-step";
export const RESOURCE_GROUP_SIZE = 3;

export const RESOURCE_KEYS = Object.freeze({
  hitPoints: "hitPoints",
  stress: "stress"
});

export const RESOURCE_ACTIONS = Object.freeze({
  [RESOURCE_KEYS.hitPoints]: "toggleHitPoints",
  [RESOURCE_KEYS.stress]: "toggleStress"
});

export const I18N_KEYS = Object.freeze({
  tier: "DAGGERHEART.GENERAL.tier"
});
