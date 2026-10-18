-- Removing a choice can invalidate existing stored values and make unrelated
-- profile edits fail validation. Extend choices; create a new field to replace
-- an existing choice contract. Deleting a field remains explicit and audited.
create or replace function private.guard_custom_field_definition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.entity is distinct from old.entity or new.key is distinct from old.key
     or new.field_type is distinct from old.field_type then
    raise exception using errcode = 'SC001', message = 'custom_field_contract_is_immutable';
  end if;
  if not old.options <@ new.options then
    raise exception using errcode = 'SC001', message = 'custom_field_options_cannot_be_removed', detail = old.key;
  end if;
  return new;
end;
$$;
revoke execute on all functions in schema public, private from public, anon;
