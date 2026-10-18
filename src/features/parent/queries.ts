import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { selectAll } from "@/server/select-all";
import { createServerSupabase } from "@/server/supabase";

export const getChildren = cache(async () => {
  await requireUser("/parent");
  const supabase = await createServerSupabase();
  return selectAll((from, to) =>
    supabase.rpc("guardian_children").order("student_id").range(from, to),
  );
});

// Resolve navigation from the guardian API. Every subsequent RPC separately
// checks access in Postgres, even when its URL is called directly.
export const getChild = cache(async (studentId: string) => {
  if (!z.uuid().safeParse(studentId).success) notFound();
  const child = (await getChildren()).find(
    (child) => child.student_id === studentId,
  );
  if (!child) notFound();
  return child;
});

const teacherSchema = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string().nullable(),
  subject: z.string().nullable(),
  photo_path: z.string().nullable(),
});
export const parentCustomFieldsSchema = z.array(
  z.object({
    key: z.string(),
    label: z.string(),
    type: z.string(),
    value: z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.string()),
      z.null(),
    ]),
  }),
);

export async function getChildCourses(studentId: string) {
  await getChild(studentId);
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("guardian_student_courses", {
    p_student_id: studentId,
  });
  if (error) throw error;
  return data.map((course) => ({
    ...course,
    teachers: z.array(teacherSchema).parse(course.teachers),
  }));
}
