import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const verificationId = String(form.get("verificationId") || "").trim();
    if (!/^ss_[A-Za-z0-9_-]{24}$/.test(verificationId)) {
      return fail(400, { error: "Enter the verification ID printed on the document." });
    }
    redirect(303, `/verify/${verificationId}`);
  },
};
