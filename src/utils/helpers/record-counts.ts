export const toSafeNumber = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getRelatedCount = <T>(items: T[] | undefined, predicate: (item: T) => boolean): number => {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.filter(predicate).length;
};
