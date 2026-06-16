import { I18N_KEYS, RESOURCE_ACTIONS, RESOURCE_GROUP_SIZE } from "./constants.js";

export const DEFAULT_ART_IMAGE = "icons/svg/mystery-man.svg";

export function buildCompactContext(document) {
  const hitPoints = buildResourceTrack("hitPoints", document.system.resources?.hitPoints);
  const stress = buildResourceTrack("stress", document.system.resources?.stress);
  const thresholds = buildThresholds(document.system.damageThresholds);
  const hordeHp = buildHordeHpContext(document.system);
  const art = getCompactDocumentArt(document);

  return {
    attackBonus: toOptionalNumber(document.system.attack?.roll?.bonus),
    artDefaultImg: art.defaultImg,
    artImg: art.img,
    artImgIsFallback: art.isFallback,
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
  const art = getCompactDocumentArt(document);
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
    artDefaultImg: art.defaultImg,
    artImg: art.img,
    artImgIsFallback: art.isFallback,
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

export function buildCompactCharacterContext(document) {
  const system = document.system ?? {};
  const hitPoints = buildResourceTrack("hitPoints", system.resources?.hitPoints);
  const stress = buildResourceTrack("stress", system.resources?.stress);
  const hope = buildResourceTrack("hope", system.resources?.hope);
  const armor = buildResourceTrack("armor", system.armorScore);
  const thresholds = buildThresholds(system.damageThresholds);
  const art = getCompactDocumentArt(document);

  return {
    artDefaultImg: art.defaultImg,
    artImg: art.img,
    artImgIsFallback: art.isFallback,
    canEditImage: document.isOwner ?? false,
    domains: buildCharacterDomains(system.domainData),
    hasExperiences: !foundry.utils.isEmpty(system.experiences),
    identity: {
      ancestry: system.ancestry ?? null,
      class: system.class?.value ?? null,
      community: system.community ?? null,
      level: getCharacterLevel(system),
      multiclass: system.multiclass?.value ?? null,
      multiclassSubclass: system.multiclass?.subclass ?? null,
      primaryLabel: getCharacterBadgeLabel(system),
      subclass: system.class?.subclass ?? null
    },
    resources: {
      armor,
      hitPoints,
      hope,
      stress
    },
    scars: Math.max(toNumber(system.scars), 0),
    status: {
      evasion: toOptionalNumber(system.evasion),
      proficiency: toOptionalNumber(system.proficiency)
    },
    thresholds
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

  return getDocumentDefaultArtImage(adversary, source);
}

export function getCompactDocumentArt(document) {
  const source = document?.toObject?.() ?? document ?? {};
  const img = normalizeImagePath(source?.img) ?? normalizeImagePath(document?.img);
  const defaultImg = getDocumentDefaultArtImage(document, source);

  return {
    defaultImg,
    img: img || defaultImg,
    isFallback: !img
  };
}

function getDocumentDefaultArtImage(document, source = null) {
  const data = source ?? document?.toObject?.() ?? document ?? {};
  const artwork = document?.constructor?.getDefaultArtwork?.(data);

  return normalizeImagePath(artwork?.img)
    ?? normalizeImagePath(document?.system?.constructor?.DEFAULT_ICON)
    ?? normalizeImagePath(document?.constructor?.DEFAULT_ICON)
    ?? DEFAULT_ART_IMAGE;
}

function normalizeImagePath(value) {
  if (typeof value !== "string") return null;

  const path = value.trim();
  if (!path || path === "null" || path === "undefined") return null;

  return path;
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

export function buildThresholds(damageThresholds = {}) {
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

export function buildResourceTrack(key, resource = {}, groupSize = RESOURCE_GROUP_SIZE) {
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

function getCharacterLevel(system = {}) {
  if (system.needsCharacterSetup) return 0;

  return toNumber(
    system.levelData?.level?.changed
      ?? system.levelData?.level?.value
      ?? system.level
  );
}

function getCharacterBadgeLabel(system = {}) {
  const labels = [
    system.class?.value?.name,
    system.multiclass?.value?.name
  ].filter(Boolean);

  return labels.length
    ? labels.join(" / ")
    : localizeFallback("DAGGERHEART.GENERAL.character", "Character");
}

function buildCharacterDomains(domainData) {
  return normalizeCollection(domainData)
    .map((domain, index) => {
      const id = typeof domain === "string"
        ? domain
        : domain?.id ?? domain?.key ?? String(index);
      const configuredDomain = getConfiguredDomain(id);
      const source = typeof domain === "string" ? configuredDomain : domain;
      const src = source?.src
        ?? source?.img
        ?? source?.icon
        ?? configuredDomain?.src
        ?? configuredDomain?.img
        ?? configuredDomain?.icon
        ?? "";

      return {
        ...configuredDomain,
        ...source,
        id,
        label: source?.label ?? source?.name ?? configuredDomain?.label ?? configuredDomain?.name ?? id,
        src
      };
    })
    .filter((domain) => domain.src);
}

function getConfiguredDomain(id) {
  try {
    return globalThis.CONFIG?.DH?.DOMAIN?.allDomains?.()?.[id] ?? null;
  } catch {
    return null;
  }
}

function normalizeCollection(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof collection[Symbol.iterator] === "function") return Array.from(collection);
  if (typeof collection === "object") return Object.values(collection);
  return [];
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
