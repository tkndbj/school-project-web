import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { parsePage } from "@/lib/pagination";
import { displayName } from "@/lib/people";
import { toIlikePattern } from "@/lib/search";
import { createServerSupabase } from "@/server/supabase";

const NAME_FILTER = (pattern: string) =>
  `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`;

export async function listGuardians(schoolId: string, filters: { q?: string; linked?: string; page?: string }) {
  const supabase = await createServerSupabase();
  const { page, pageSize, from, to } = parsePage(filters.page);

  let query = supabase
    .from("guardians")
    .select("id, first_name, last_name, email, phone, user_id, link_method, student_guardians(count)", {
      count: "exact",
    })
    .eq("school_id", schoolId);
  const pattern = toIlikePattern(filters.q);
  if (pattern) query = query.or(NAME_FILTER(pattern));
  if (filters.linked === "yes") query = query.not("user_id", "is", null);
  if (filters.linked === "no") query = query.is("user_id", null);

  const { data, count, error } = await query
    .order("last_name", { nullsFirst: false })
    .order("first_name", { nullsFirst: false })
    .order("id")
    .range(from, to);
  if (error) throw error;

  return {
    rows: data.map((g) => ({
      ...g,
      childrenCount: (g.student_guardians as unknown as { count: number }[])[0]?.count ?? 0,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export const getGuardian = cache(async (schoolId: string, guardianId: string) => {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("guardians")
    .select("*")
    .eq("school_id", schoolId)
    .eq("id", guardianId)
    .maybeSingle();
  if (!data) notFound();
  return data;
});

export async function getGuardianChildren(schoolId: string, guardianId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("student_guardians")
    .select("id, relationship, is_primary, students(id, first_name, last_name, preferred_name, student_number, grade_level, section)")
    .eq("school_id", schoolId)
    .eq("guardian_id", guardianId);
  if (error) throw error;
  return data;
}

export async function getStudentGuardians(schoolId: string, studentId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("student_guardians")
    .select("id, relationship, is_primary, guardians(id, first_name, last_name, email, phone, user_id, link_method)")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .order("is_primary", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getGuardianInvites(schoolId: string, guardianId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("guardian_invites")
    .select("id, expires_at, created_at, redeemed_at, revoked_at")
    .eq("school_id", schoolId)
    .eq("guardian_id", guardianId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data;
}

export async function searchGuardians(schoolId: string, q: string) {
  const supabase = await createServerSupabase();
  let query = supabase.from("guardians").select("id, first_name, last_name, email, phone").eq("school_id", schoolId);
  const pattern = toIlikePattern(q);
  if (pattern) query = query.or(NAME_FILTER(pattern));
  const { data, error } = await query.order("last_name").limit(20);
  if (error) throw error;
  return data.map((g) => ({ id: g.id, label: displayName(g), description: g.email ?? g.phone }));
}
