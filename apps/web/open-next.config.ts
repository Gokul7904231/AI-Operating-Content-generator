import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig();
config.cloudflare = {
  useWorkerdCondition: false,
};

export default config;
