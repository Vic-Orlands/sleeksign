import type { RequestHandler } from "./$types";
import { auth } from "@/lib/auth";

const handler: RequestHandler = async ({ request }) => {
  return auth.handler(request);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
