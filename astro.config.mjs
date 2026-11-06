import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://koreafood.keevandance.com",
  output: "static",
  trailingSlash: "ignore",
  build: { format: "directory" },
  integrations: [preact({ compat: false }), sitemap()],
  devToolbar: { enabled: false },
});
