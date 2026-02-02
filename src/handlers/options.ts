import { Effect } from "effect";
import { SUPPORT_METHODS, DAV_CLASS } from "../types";

export const handleOptions = (): Effect.Effect<Response> =>
  Effect.succeed(
    new Response(null, {
      status: 204,
      headers: {
        Allow: SUPPORT_METHODS.join(", "),
        DAV: DAV_CLASS,
      },
    })
  );
