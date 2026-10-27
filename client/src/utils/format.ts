/**
 * Format public channel display names with proper Title Case (Section 7)
 * e.g. general -> General, team-updates -> Team Updates, help and support -> Help And Support
 */
export function formatChannelName(name: string): string {
  if (!name) return '';
  return name
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => {
      // Keep minor words lowercase if in middle, or capitalize
      const lower = w.toLowerCase();
      if (['and', 'or', 'the', 'of', 'for', 'in', 'on'].includes(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ')
    .replace(/^[a-z]/, (c) => c.toUpperCase()); // ensure first word is capitalized
}
