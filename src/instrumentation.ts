import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./server/env");
}

/** Error digests correlate browser errors with logs without logging student data. */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  console.error(
    JSON.stringify({
      event: "request_error",
      timestamp: new Date().toISOString(),
      digest:
        typeof error === "object" && error !== null && "digest" in error
          ? String(error.digest)
          : undefined,
      method: request.method,
      route: context.routePath,
      router: context.routerKind,
    }),
  );
};
