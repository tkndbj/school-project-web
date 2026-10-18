type NameParts = {
  first_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  title?: string | null;
  student_number?: string | null;
  staff_number?: string | null;
  email?: string | null;
};

/** Best human-readable name for a person record; never empty when any identifier exists. */
export function displayName(person: NameParts, fallback = "—"): string {
  const first = person.preferred_name || person.first_name;
  const full = [person.title, first, person.last_name].filter(Boolean).join(" ").trim();
  return full || person.student_number || person.staff_number || person.email || fallback;
}

/** Whole years between a birth date (YYYY-MM-DD) and `today`. */
export function ageFromBirthDate(dateOfBirth: string | null | undefined, today = new Date()): number | null {
  if (!dateOfBirth) return null;
  const [y, m, d] = dateOfBirth.split("-").map(Number) as [number, number, number];
  if (!y || !m || !d) return null;
  let age = today.getFullYear() - y;
  const beforeBirthday = today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

/** One or two uppercase initials for avatars. */
export function initials(name: string | null | undefined, fallback = "?"): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return (parts[0]![0]! + (parts.length > 1 ? parts.at(-1)![0]! : "")).toLocaleUpperCase();
}
