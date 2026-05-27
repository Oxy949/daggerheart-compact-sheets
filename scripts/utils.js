import { I18N_KEYS, RESOURCE_ACTIONS, RESOURCE_GROUP_SIZE } from "./constants.js";

export function buildCompactContext(document) {
  const hitPoints = buildResourceTrack("hitPoints", document.system.resources?.hitPoints);
  const stress = buildResourceTrack("stress", document.system.resources?.stress);
  const thresholds = buildThresholds(document.system.damageThresholds);
  const hordeHp = buildHordeHpContext(document.system);

  return {
    attackBonus: toOptionalNumber(document.system.attack?.roll?.bonus),
    canEditImage: document.isOwner ?? false,
    criticalThreshold: toNumber(document.system.criticalThreshold, 20),
    hasExperiences: !foundry.utils.isEmpty(document.system.experiences),
    identity: {
      hordeHp,
      tierLabel: localizeFallback(I18N_KEYS.tier, "Tier")
    },
    resources: {
      hitPoints,
      stress
    },
    thresholds
  };
}

export async function buildCompactEnvironmentContext(document) {
  const typeKey = document.system.type
    ? `DAGGERHEART.CONFIG.EnvironmentType.${document.system.type}.label`
    : null;

  const potentialAdversaryCategories = (await Promise.all(
    Object.entries(document.system.potentialAdversaries ?? {})
      .map(async ([id, category]) => {
        const adversaries = await Promise.all(
          Array.from(category?.adversaries ?? [])
            .map(buildPotentialAdversaryContext)
        );

        return {
          adversaries,
          count: adversaries.length,
          id,
          label: category?.label ?? id
        };
      })
  ))
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

async function buildPotentialAdversaryContext(adversary) {
  const document = await resolvePotentialAdversaryDocument(adversary);
  const source = document ?? adversary ?? {};
  const uuid = getPotentialAdversaryUuid(source, adversary);
  const system = source?.system ?? {};
  const tier = toOptionalNumber(system.tier);
  const difficulty = toOptionalNumber(system.difficulty);
  const typeLabel = system.type
    ? localizeFallback(`DAGGERHEART.CONFIG.AdversaryType.${system.type}.label`, system.type)
    : null;
  const meta = getPotentialAdversaryMeta(source, {
    tier,
    typeLabel
  });

  return {
    id: source?.id ?? source?._id ?? uuid,
    img: source?.img || adversary?.img || getActorDefaultImage(source),
    meta,
    metaText: meta.join(" "),
    name: localizeFallback(source?.name, adversary?.name ?? uuid),
    system: {
      difficulty,
      tier,
      type: system.type ?? null
    },
    uuid
  };
}

async function resolvePotentialAdversaryDocument(adversary) {
  const embeddedDocument = [
    adversary,
    adversary?.document,
    adversary?.actor,
    adversary?.object,
    adversary?.item
  ].find(hasPotentialAdversarySystem);

  if (embeddedDocument) return embeddedDocument;

  const uuid = getPotentialAdversaryUuid(adversary);
  if (!uuid) return adversary;

  try {
    const fromUuid = globalThis.fromUuid ?? globalThis.foundry?.utils?.fromUuid;
    if (typeof fromUuid !== "function") return adversary;

    return await fromUuid(uuid) ?? adversary;
  } catch {
    return adversary;
  }
}

function hasPotentialAdversarySystem(adversary) {
  const system = adversary?.system;
  if (!system) return false;

  return system.tier !== undefined
    || system.difficulty !== undefined
    || Boolean(system.type)
    || typeof adversary?._getTags === "function"
    || typeof system?._getTags === "function";
}

function getPotentialAdversaryUuid(...sources) {
  for (const source of sources) {
    if (typeof source === "string") return source;
    if (source?.uuid) return source.uuid;
  }

  return "";
}

function getPotentialAdversaryMeta(adversary, { tier, typeLabel }) {
  const tags = getVisiblePotentialAdversaryTags(normalizeLabelList(adversary?._getTags?.()));
  if (tags.length) return tags;

  const systemTags = getVisiblePotentialAdversaryTags(normalizeLabelList(adversary?.system?._getTags?.()));
  if (systemTags.length) return systemTags;

  return [
    tier === null
      ? null
      : localizeFallback(
        `DAGGERHEART.GENERAL.Tiers.${tier}`,
        `${localizeFallback(I18N_KEYS.tier, "Tier")} ${tier}`
      ),
    typeLabel
  ].filter(Boolean);
}

function getVisiblePotentialAdversaryTags(tags) {
  return tags.filter((tag) => !isDifficultyTag(tag));
}

function isDifficultyTag(tag) {
  const normalizedTag = String(tag).trim().toLocaleLowerCase();
  const difficultyLabel = localizeFallback(I18N_KEYS.difficulty, "Difficulty")
    .toLocaleLowerCase();

  return normalizedTag.startsWith(`${difficultyLabel}:`)
    || normalizedTag.startsWith("difficulty:");
}

function getActorDefaultImage(adversary) {
  const source = adversary?.toObject?.() ?? adversary ?? {};
  const artwork = adversary?.constructor?.getDefaultArtwork?.(source);

  return artwork?.img ?? "icons/svg/mystery-man.svg";
}

function normalizeLabelList(labels) {
  if (!labels) return [];

  return Array.from(labels)
    .map((label) => typeof label === "object" ? label.value : label)
    .filter(Boolean);
}

export function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(Math.max(number, min), max);
}

export function localizeFallback(key, fallback) {
  if (!key) return fallback;

  const localized = game.i18n?.localize?.(key);
  return localized && localized !== key ? localized : fallback;
}

function buildHordeHpContext(system = {}) {
  if (system.type !== "horde") return null;

  const value = toOptionalNumber(system.hordeHp);
  if (value === null) return null;

  return {
    unitLabel: localizeFallback(I18N_KEYS.hitPointsShort, "HP"),
    value
  };
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
