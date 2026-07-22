import { NextResponse } from "next/server";

/**
 * Wraps a route handler so any thrown error (DB not configured, connection
 * refused, bad query, etc.) comes back as { error: "..." } with a 500,
 * instead of Next's generic error page that the client can't parse.
 */
export function withErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("[api error]", err);
      const message = err instanceof Error ? err.message : "Unexpected server error.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
