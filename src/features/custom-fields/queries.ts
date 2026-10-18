import { selectAll } from "@/server/select-all";
import "server-only";
import type { Enums } from "@/lib/supabase/types";
import { createServerSupabase } from "@/server/supabase";
import type { CustomFieldDefinition } from "./values";

export async function getCustomFieldDefinitions(
  schoolId: string,
  entity: Enums<"custom_field_entity">,
): Promise<CustomFieldDefinition[]> {
  const supabase = await createServerSupabase();
  const data = await selectAll((from, to) =>
    supabase
      .from("custom_field_definitions")
      .select(
        "id, key, label, field_type, options, visible_to_guardians, sort_order",
      )
      .eq("school_id", schoolId)
      .eq("entity", entity)
      .order("sort_order")
      .order("label")
      .order("id")
      .range(from, to),
  );
  return data;
}
