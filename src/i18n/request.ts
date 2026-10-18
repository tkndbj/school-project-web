import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { isLocale, localeCookieName, negotiateLocale } from "./config";

// The UI language is a user preference (cookie, synced with profiles.locale),
// not part of the URL: every page here is private, so there is nothing to index.
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(localeCookieName)?.value;
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : negotiateLocale((await headers()).get("accept-language"));

  return {
    locale,
    timeZone: "UTC",
    now: new Date(),
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
