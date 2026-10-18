import "server-only";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import type { SchoolModule, SchoolRole, Tables } from "@/lib/supabase/types";
import { createServerSupabase } from "./supabase";

// Data Access Layer: the only place that decides who the current user is and
// what they may open. Pages, layouts, server actions and route handlers all go
// through these helpers; the database's RLS policies remain the final guard.

const membershipSchema = z.object({
  school_id: z.uuid(),
  school_name: z.string(),
  slug: z.string(),
  role: z.enum(["admin", "staff"]),
  logo_path: z.string().nullable(),
  primary_color: z.string().nullable(),
  default_locale: z.string(),
  timezone: z.string(),
  enabled_modules: z.array(z.string()).transform((m) => m as SchoolModule[]),
});

const accountContextSchema = z.object({
  user_id: z.uuid(),
  is_platform_admin: z.boolean(),
  memberships: z.array(membershipSchema),
  children_count: z.number().int(),
});

export type Membership = z.infer<typeof membershipSchema>;
export type AccountContext = z.infer<typeof accountContextSchema>;

export type CurrentUser = {
  id: string;
  email: string | null;
  /** Authenticator assurance level of the session: "aal2" once MFA was passed. */
  aal: "aal1" | "aal2";
};

/** Verified identity of the current request, or null when signed out. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const { claims } = data;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    aal: claims.aal === "aal2" ? "aal2" : "aal1",
  };
});

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user)
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export const getAccountContext = cache(async (): Promise<AccountContext> => {
  await requireUser();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("my_account_context");
  if (error) throw new Error(`my_account_context failed: ${error.message}`);
  return accountContextSchema.parse(data);
});

/** Where a user lands after signing in, based on what they have access to. */
export async function getHomePath(): Promise<Route> {
  const context = await getAccountContext();
  if (context.is_platform_admin) return "/admin";
  if (context.memberships.length === 1 && context.children_count === 0) {
    return `/school/${context.memberships[0]!.slug}` as Route;
  }
  if (context.memberships.length === 0) return "/parent";
  return "/home";
}

/** Platform (master) admin with a multi-factor session. */
export async function requirePlatformAdmin(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  const context = await getAccountContext();
  if (!context.is_platform_admin) notFound(); // do not reveal that the page exists
  if (user.aal !== "aal2") redirect("/auth/mfa?next=/admin");
  return user;
}

export type SchoolAccess = {
  school: Tables<"schools">;
  /** Platform admins act with admin rights inside any school. */
  role: SchoolRole;
  isPlatformAdmin: boolean;
  user: CurrentUser;
};

export const requireSchool = cache(
  async (slug: string): Promise<SchoolAccess> => {
    const user = await requireUser(`/school/${slug}`);
    const context = await getAccountContext();
    const membership = context.memberships.find((m) => m.slug === slug);

    if (!membership && !context.is_platform_admin) notFound();
    if (!membership && user.aal !== "aal2")
      redirect(`/auth/mfa?next=/school/${slug}`);

    const supabase = await createServerSupabase();
    const { data: school, error } = await supabase
      .from("schools")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!school) notFound();

    return {
      school,
      role: membership?.role ?? "admin",
      isPlatformAdmin: !membership && context.is_platform_admin,
      user,
    };
  },
);

export async function requireSchoolAdmin(slug: string): Promise<SchoolAccess> {
  const access = await requireSchool(slug);
  if (access.role !== "admin") notFound(); // do not reveal that the page exists
  return access;
}

export function hasModule(
  school: Pick<Tables<"schools">, "enabled_modules">,
  module: SchoolModule,
) {
  return school.enabled_modules.includes(module);
}

export async function requireModule(
  slug: string,
  module: SchoolModule,
): Promise<SchoolAccess> {
  const access = await requireSchool(slug);
  if (!hasModule(access.school, module)) notFound();
  return access;
}

/**
 * Authorisation for server actions, which receive ids rather than slugs.
 * Returns the access record or null; callers turn null into a "forbidden" result.
 */
export async function authorizeSchoolAction(
  schoolId: string,
  options: { adminOnly?: boolean } = {},
): Promise<SchoolAccess | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const context = await getAccountContext();
  const membership = context.memberships.find((m) => m.school_id === schoolId);
  const isPlatformAdmin = context.is_platform_admin && user.aal === "aal2";
  if (!membership && !isPlatformAdmin) return null;
  const role: SchoolRole = membership?.role ?? "admin";
  if (options.adminOnly && role !== "admin") return null;

  const supabase = await createServerSupabase();
  const { data: school, error } = await supabase
    .from("schools")
    .select("*")
    .eq("id", schoolId)
    .maybeSingle();
  if (error) throw error;
  if (!school) return null;
  return {
    school,
    role,
    isPlatformAdmin: !membership && isPlatformAdmin,
    user,
  };
}

/** Authorisation for platform-admin server actions (MFA session required). */
export async function authorizePlatformAction(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || user.aal !== "aal2") return null;
  const context = await getAccountContext();
  return context.is_platform_admin ? user : null;
}
