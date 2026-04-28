function slugifyProductIdPart(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return normalized || 'unknown';
}

function makeProductId(kind, idPrefix = 'ps', parts = []) {
  const safeKind = String(kind ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!safeKind) {
    throw new Error('makeProductId(kind) requires a non-empty kind.');
  }

  const safePrefix = slugifyProductIdPart(idPrefix).replace(/-/g, '_');
  const normalizedParts = Array.isArray(parts) ? parts : [parts];
  const safeParts = normalizedParts
    .map((part) => slugifyProductIdPart(part))
    .filter(Boolean);

  if (!safeParts.length) {
    return `${safeKind}_${safePrefix}`;
  }

  return [`${safeKind}_${safePrefix}`, ...safeParts].join('__');
}

export {
  makeProductId,
  slugifyProductIdPart,
};
