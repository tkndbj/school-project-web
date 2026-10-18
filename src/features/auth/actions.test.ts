import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  updateUser: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("@/server/password-session", () => ({
  PASSWORD_MFA_PATH: "/auth/mfa?next=/auth/set-password",
  requirePasswordChangeSession: mocks.session,
}));
vi.mock("@/server/supabase", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/env", () => ({ publicEnv: {} }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { setPassword } from "./actions";

const input = { password: "RegressionTestPassword42!" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({
    supabase: { auth: { updateUser: mocks.updateUser } },
  });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.redirect.mockImplementation((path) => {
    throw new Error(`redirect:${path}`);
  });
});

it("never updates a password before the session guard completes", async () => {
  mocks.session.mockRejectedValue(
    new Error("redirect:/auth/mfa?next=/auth/set-password"),
  );
  await expect(setPassword(input)).rejects.toThrow("redirect:/auth/mfa");
  expect(mocks.updateUser).not.toHaveBeenCalled();
});

it("updates a password after the session guard accepts the user", async () => {
  expect(await setPassword(input)).toEqual({ ok: true, data: undefined });
  expect(mocks.updateUser).toHaveBeenCalledWith(input);
});

it("handles a factor enrolled between the preflight and Auth update", async () => {
  mocks.updateUser.mockResolvedValue({
    error: { code: "insufficient_aal", status: 401 },
  });
  await expect(setPassword(input)).rejects.toThrow(
    "redirect:/auth/mfa?next=/auth/set-password",
  );
});

it.each([
  ["same_password", "samePassword", 422],
  ["weak_password", "weakPassword", 422],
  ["over_request_rate_limit", "rateLimited", 429],
])("reports %s without a generic failure", async (code, key, status) => {
  mocks.updateUser.mockResolvedValue({ error: { code, status } });
  expect(await setPassword(input)).toMatchObject({ ok: false, error: { key } });
});

it("rejects invalid passwords before any Auth operation", async () => {
  expect(await setPassword({ password: "short" })).toMatchObject({
    ok: false,
    error: { key: "invalidValue" },
  });
  expect(mocks.session).not.toHaveBeenCalled();
  expect(mocks.updateUser).not.toHaveBeenCalled();
});
