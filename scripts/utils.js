import { I18N_KEYS, RESOURCE_ACTIONS, RESOURCE_GROUP_SIZE } from "./constants.js";

export function buildCompactContext(document) {
  const hitPoints = buildResourceTrack("hitPoints", document.system.resources?.hitPoints);
  const stress = buildResourceTrack("stress", document.system.resources?.stress);
  const thresholds = buildThresholds(document.system.damageThresholds);

  return {
    attackBonus: toOptionalNumber(document.system.attack?.roll?.bonus),
    canEditImage: document.isOwner ?? false,
    criticalThreshold: toNumber(document.system.criticalThreshold, 20),
    hasExperiences: !foundry.utils.isEmpty(document.system.experiences),
    identity: {
      tierLabel: localizeFallback(I18N_KEYS.tier, "Tier")
    },
    resources: {
      hitPoints,
      stress
    },
    thresholds
  };
}

export function buildCompactEnvironmentContext(document) {
  const typeKey = document.system.type
    ? `DAGGERHEART.CONFIG.EnvironmentType.${document.system.type}.label`
    : null;

  const potentialAdversaryCategories = Object.entries(document.system.potentialAdversaries ?? {})
    .map(([id, category]) => ({
      adversaries: Array.from(category?.adversaries ?? []),
      id,
      label: category?.label ?? id
    }))
    .filter((category) => category.adversaries.length > 0);

  return {
    canEditImage: document.isOwner ?? false,
    hasImpulses: hasRenderableRichText(document.system.impulses),
    hasPotentialAdversaries: potentialAdversaryCategories.length > 0,
    identity: {
      tierLabel: localizeFallback(I18N_KEYS.tier, "Tier"),
      typeLabel: typeKey ? localizeFallback(typeKey, document.system.type) : null
    },
    potentialAdversaryCategories
  };
}

export function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(Math.max(number, min), max);
}

export function localizeFallback(key, fallback) {
  const localized = game.i18n?.localize?.(key);
  return localized && localized !== key ? localized : fallback;
}

function buildThresholds(damageThresholds = {}) {
  const major = Math.max(toNumber(damageThresholds.major), 0);
  const severe = Math.max(toNumber(damageThresholds.severe, major), major);

  return {
    major,
    severe,
    minorRange: major > 0 ? `< ${major}` : "-",
    majorRange: major > 0 ? (severe > major ? `${major}-${severe - 1}` : `${major}+`) : "-",
    severeRange: severe > 0 ? `${severe}+` : "-"
  };
}

function buildResourceTrack(key, resource = {}, groupSize = RESOURCE_GROUP_SIZE) {
  const max = Math.max(toNumber(resource.max), 0);
  const value = clampNumber(resource.value, 0, max);

  const slots = Array.from({ length: max }, (_, index) => {
    const slotValue = index + 1;

    return {
      action: RESOURCE_ACTIONS[key],
      filled: value >= slotValue,
      value: slotValue
    };
  });

  return {
    key,
    max,
    slotGroups: groupItems(slots, groupSize),
    slots,
    value
  };
}

function groupItems(items, size) {
  if (!items.length) return [];

  const normalizedSize = Math.max(Math.trunc(size) || 1, 1);
  const groups = [];

  for (let index = 0; index < items.length; index += normalizedSize) {
    groups.push(items.slice(index, index + normalizedSize));
  }

  return groups;
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toOptionalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hasRenderableRichText(value) {
  if (typeof value !== "string") return Boolean(value);

  return Boolean(
    value
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .trim()
  );
}
