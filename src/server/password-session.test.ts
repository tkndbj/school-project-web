import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getUser: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("./auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("./supabase", () => ({
  createServerSupabase: () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  PASSWORD_MFA_PATH,
  requirePasswordChangeSession,
} from "./password-session";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({
    id: "owner",
    email: "owner@school.org",
    aal: "aal1",
  });
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "owner", factors: [] } },
    error: null,
  });
  mocks.redirect.mockImplementation((path) => {
    throw new Error(`redirect:${path}`);
  });
});

it("requires the existing authenticator before an email-recovered user can choose a password", async () => {
  mocks.getUser.mockResolvedValue({
    data: {
      user: {
        id: "owner",
        factors: [{ status: "verified", factor_type: "totp" }],
      },
    },
    error: null,
  });
  await expect(requirePasswordChangeSession()).rejects.toThrow(
    `redirect:${PASSWORD_MFA_PATH}`,
  );
  expect(mocks.redirect).toHaveBeenCalledWith(PASSWORD_MFA_PATH);
});

it("allows an MFA-protected user after their session passes the authenticator challenge", async () => {
  mocks.requireUser.mockResolvedValue({
    id: "owner",
    email: "owner@school.org",
    aal: "aal2",
  });
  mocks.getUser.mockResolvedValue({
    data: {
      user: {
        id: "owner",
        factors: [{ status: "verified", factor_type: "totp" }],
      },
    },
    error: null,
  });
  expect((await requirePasswordChangeSession()).user.aal).toBe("aal2");
  expect(mocks.redirect).not.toHaveBeenCalled();
});

it("allows password setup for an invited user without MFA", async () => {
  expect((await requirePasswordChangeSession()).user.id).toBe("owner");
  expect(mocks.redirect).not.toHaveBeenCalled();
});

it("does not treat an abandoned, unverified factor as active MFA", async () => {
  mocks.getUser.mockResolvedValue({
    data: {
      user: {
        id: "owner",
        factors: [{ status: "unverified", factor_type: "totp" }],
      },
    },
    error: null,
  });
  await requirePasswordChangeSession();
  expect(mocks.redirect).not.toHaveBeenCalled();
});

it.each([
  { data: { user: null }, error: { code: "session_not_found" } },
  { data: { user: { id: "different-user", factors: [] } }, error: null },
])(
  "rejects revoked or inconsistent sessions before password changes",
  async (result) => {
    mocks.getUser.mockResolvedValue(result);
    await expect(requirePasswordChangeSession()).rejects.toThrow(
      "redirect:/login?next=%2Fauth%2Fset-password",
    );
  },
);
