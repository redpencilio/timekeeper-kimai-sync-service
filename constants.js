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

export const FALLBACK_SYNC_CRON = process.env.FALLBACK_SYNC_CRON || '0 0 */2 * * *'; // every 2h by default

export const SPARQL_PREFIXES = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX ui: <http://www.w3.org/ns/ui#>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX wf: <http://www.w3.org/2005/01/wf/flow#>
  PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX doap: <http://usefulinc.com/ns/doap#>
  PREFIX time: <http://www.w3.org/2006/time#>
  PREFIX adms: <http://www.w3.org/ns/adms#>
  PREFIX cal: <http://www.w3.org/2002/12/cal/ical#>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
`

export const TIMESHEET_STATUSES = {
  DRAFT: 'http://timekeeper.redpencil.io/concepts/f1fa3569-7f98-47a9-b03b-90b42e9f3c52',
  ABSENCE_SUBMITTED: 'http://timekeeper.redpencil.io/concepts/01ddb33a-a15b-49d6-8422-bc78123db966',
  SUBMITTED: 'http://timekeeper.redpencil.io/concepts/8ba56847-1713-478c-aa63-6eace21b3adf',
  EXPORTED: 'http://timekeeper.redpencil.io/concepts/9d50b644-3d61-4a9d-b3a9-0b27f4f1d566',
}
