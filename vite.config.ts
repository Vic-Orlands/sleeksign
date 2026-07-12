import path from "node:path";
import { fileURLToPath } from "node:url";

import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import dotenv from "dotenv";
import { defineConfig } from "vite";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: {
		alias: {
			"@": path.resolve(root, "src"),
		},
	},
});
