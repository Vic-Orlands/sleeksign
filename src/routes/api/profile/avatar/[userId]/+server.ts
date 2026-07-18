import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  buildProfileAvatarKey,
  getR2ObjectStream,
} from "$lib/r2-storage";

export const GET: RequestHandler = async ({ params }) => {
  try {
    const object = await getR2ObjectStream(buildProfileAvatarKey(params.userId));
    if (!object.body) throw error(404, "Avatar not found");

    return new Response(object.body, {
      headers: {
        "Content-Type": object.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(object.contentLength
          ? { "Content-Length": String(object.contentLength) }
          : {}),
      },
    });
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    throw error(404, "Avatar not found");
  }
};
