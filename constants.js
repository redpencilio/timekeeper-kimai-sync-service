export const API_TOKEN = process.env.API_TOKEN;
if (!API_TOKEN) {
  throw Error("Environment variable API_TOKEN is mandatory.");
}

export const KIMAI_ENDPOINT = process.env.KIMAI_ENDPOINT;
if (!KIMAI_ENDPOINT) {
  throw Error("environment variable KIMAI_ENDPOINT is mandatory.")
}
if (KIMAI_ENDPOINT.endsWith("/")) {
  console.warn("Environment variable KIMAI_ENDPOINT should not contain a trailing `/`.")
}
if (KIMAI_ENDPOINT.startsWith("http://")) {
  console.warn("Environment variable KIMAI_ENDPOINT must use https protocol.")
}

export const RESOURCE_BASE_URI = process.env.RESOURCE_BASE_URI || 'http://timekeeper.redpencil.io';
export const WORKSPACE_URI = process.env.WORKSPACE_URI || 'http://timekeeper.redpencil.io/workspaces/7530c9c9-4905-4fae-b63f-7a8d29232377';
export const KIMAI_ACCOUNT_SERVICE_HOMEPAGE = process.env.KIMAI_ACCOUNT_SERVICE_HOMEPAGE || 'http://kimai.redpencil.io';
