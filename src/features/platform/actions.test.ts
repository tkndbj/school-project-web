import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  single: vi.fn(),
  invite: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/server/auth", () => ({ authorizePlatformAction: mocks.authorize }));
vi.mock("@/server/members", () => ({ addMemberByEmail: mocks.invite }));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("@/server/supabase", () => ({
  createServerSupabase: () => ({
    from: () => ({
      insert: () => ({ select: () => ({ single: mocks.single }) }),
    }),
  }),
}));
import { createSchool } from "./actions";

const input = {
  name: "A real school",
  slug: "real-school",
  timezone: "UTC",
  default_locale: "en" as const,
  enabled_modules: [],
  first_admin_email: "admin@school.org",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorize.mockResolvedValue({ id: "operator" });
  mocks.single.mockResolvedValue({ data: { id: "school-id" }, error: null });
});
it("keeps a created school manageable when email delivery fails", async () => {
  mocks.invite.mockResolvedValue({ ok: false, error: { key: "unknown" } });
  expect(await createSchool(input)).toEqual({
    ok: true,
    data: { id: "school-id", adminInvitationFailed: true },
  });
  expect(mocks.refresh).toHaveBeenCalledOnce();
});
it("rejects a school creation before making changes when the operator is unauthorized", async () => {
  mocks.authorize.mockResolvedValue(null);
  expect((await createSchool(input)).ok).toBe(false);
  expect(mocks.single).not.toHaveBeenCalled();
  expect(mocks.invite).not.toHaveBeenCalled();
});
