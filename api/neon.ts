import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  auth: true,
  buckets: {
    // D14: uploads land in the private bucket through signed URLs; published media is public
    uploads: { access: "private" },
    media: { access: "public_read" },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    // production (default), staging and development are long-lived and never expire
    if (branch.isDefault || branch.name === "staging" || branch.name === "development") {
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
