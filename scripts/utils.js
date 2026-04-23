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
    hitPoints: pickResourceSummary(hitPoints),
    hitPointSlotGroups: hitPoints.slotGroups,
    hitPointSlots: hitPoints.slots,
    identity: {
      tierLabel: localizeFallback(I18N_KEYS.tier, "Tier")
    },
    resources: {
      hitPoints,
      stress
    },
    stress: pickResourceSummary(stress),
    stressSlotGroups: stress.slotGroups,
    stressSlots: stress.slots,
    thresholds,
    thresholdMajor: thresholds.major,
    thresholdSevere: thresholds.severe
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

function pickResourceSummary(resource) {
  return {
    value: resource.value,
    max: resource.max
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
