import { expect, test } from "@playwright/test";

test("login renders and validates without a hydration or CSP error", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["content-security-policy"]).toContain("'nonce-");
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText("Enter a valid email address.", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("signed-out users cannot enter either private area", async ({
  request,
}) => {
  for (const target of [
    "/admin",
    "/parent",
    "/school/demo",
    "/account",
    "/home",
  ]) {
    const response = await request.get(target, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain("/login?next=");
  }
});

test.describe("Turkish locale", () => {
  test.use({ locale: "tr-TR" });
  test("uses the requested locale", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    await expect(page.getByRole("heading")).toContainText("Hoş");
  });
});
