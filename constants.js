// default graph used for any graph type not specified in config/mapping.json config
export const DATA_GRAPH = process.env.DATA_GRAPH || "http://mu.semte.ch/graphs/public";

export const API_TOKEN = process.env.API_TOKEN;
if(!API_TOKEN) { throw Error("environment variable API_TOKEN is mandatory.")}

export const KIMAI_ENDPOINT = process.env.KIMAI_ENDPOINT;
if(!KIMAI_ENDPOINT) { throw Error("environment variable KIMAI_ENDPOINT is mandatory.")}
if(KIMAI_ENDPOINT.endsWith("/")) { console.warn("environment variable KIMAI_ENDPOINT should not contain a trailing `/`.")}
if(KIMAI_ENDPOINT.startsWith("http://")) { console.warn("environment variable KIMAI_ENDPOINT should be the https endpoint.")}