import { DATA_GRAPH } from "./constants";
import fs from "fs";
import cloneDeep from "lodash.clonedeep";

const RESOURCE_DOMAIN = JSON.parse(
  fs.readFileSync("./config/domain.json", "utf-8")
);
export const RESOURCE_CONFIGS = RESOURCE_DOMAIN["resources"];
export const PREFIXES = RESOURCE_DOMAIN["prefixes"];
export const PREFIXES_SPARQL = Object.entries(PREFIXES).map(
  ([key, value]) => `PREFIX ${key}: <${value}>`
).join("\n");

const MAPPINGS = JSON.parse(
  fs.readFileSync("./config/mapping.json", "utf-8")
);

export function domainConfigForTarget(target) {
  const [k, v] = Object.entries(RESOURCE_CONFIGS).find(([key, conf]) => conf.name === target);
  return v
}

export function mergedConfigOfType(kimaiEndpointType) {
  if(!(kimaiEndpointType in MAPPINGS)) {
    throw new Error(`mapping.json does not contain config for kimai endpoint '${kimaiEndpointType}'`);
  }
  const resourceName = MAPPINGS[kimaiEndpointType].resourceName
  if(!(resourceName in RESOURCE_CONFIGS)) {
    throw new Error(`The defined resourceName '${resourceName}' in mapping.json for '${kimaiEndpointType}' is not present in domain.json.`);
  }
  return mergeDomainMapping(
    RESOURCE_CONFIGS[resourceName],
    MAPPINGS[kimaiEndpointType]
  );
}

// merge config of domain and mapping of one type of entity, only keep properties defined in mapping
// adds `kimaiField` property to attributes.
function mergeDomainMapping(domain, mapping) {
  const { attributes: kimaiAttributes = {}, relationships: kimaiRelationships = {}, ...restMapping } =  mapping;
  // using cloneDeep out of convenience. There might be a better way.
  const merged = { ...cloneDeep(domain), ...cloneDeep(restMapping) };
  merged.kimaiAttributes = kimaiAttributes;
  merged.kimaiRelationships = kimaiRelationships;
  merged.attributes = merged.attributes || {};
  merged.relationships = merged.relationships || {};
  for (const [kimaiField, config] of Object.entries(kimaiAttributes)) {
    if(!(config.resourceName in merged.attributes)) {
      throw new Error(`Error in config files. the attributes of resource with 'name' = '${domain.name}' in domain.json does not contain the attribute '${config.resourceName}' defined in mapping.json.`)
    }
    merged.attributes[config.resourceName].kimaiField = kimaiField;
  }
  for (const [kimaiField, config] of Object.entries(kimaiRelationships)) {
    if(!(config.resourceName in merged.relationships)) {
      throw new Error(`Error in config files. the relationships of resource with 'name' = '${domain.name}' in domain.json does not contain the relationship '${config.resourceName}' defined in mapping.json.`)
    }
    merged.relationships[config.resourceName].kimaiField = kimaiField;
  }
  // remove domain.json information for anything that was not mapped
  for(const attrKey in merged.attributes) {
    if(!merged.attributes[attrKey].kimaiField) {delete merged.attributes[attrKey]; }
  }
  for(const attrKey in merged.relationships) {
    if(!merged.relationships[attrKey].kimaiField) {delete merged.relationships[attrKey]; }
  }
  
  merged.newResourceBase = merged['new-resource-base']; // just for easy of use.
  if(!merged.graph) {
    merged.graph = DATA_GRAPH;
  }
  return merged;
}