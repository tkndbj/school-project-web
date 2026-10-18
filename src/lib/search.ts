/**
 * Builds a safe ILIKE pattern for PostgREST filters from free-text input.
 * Characters with meaning in PostgREST filter syntax (`,()"`) are removed, and
 * LIKE wildcards / the escape character are escaped, so user input can never
 * alter the filter.
 */
export function toIlikePattern(input: string | undefined | null): string | null {
  if (!input) return null;
  const cleaned = input
    .replace(/[,()"]/g, " ")
    .replace(/[\\%_]/g, (char) => "\\" + char)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return cleaned ? `%${cleaned}%` : null;
}
