import { domainConfigForTarget, MAPPINGS, mergedConfigOfType, PREFIXES_SPARQL, RESOURCE_CONFIGS, RESOURCE_DOMAIN } from "./api-predicates-mapping";
import { querySudo, updateSudo } from "@lblod/mu-auth-sudo";
import {
  sparqlEscapeString,
  sparqlEscapeUri,
  sparqlEscape,
  uuid,
} from "mu";
import { joinAndEnd } from "./utils-javascript";

// updates properties of an entity. Creates the entity (adding a mu:uuid) if it does not exist yet.
export async function updateEntitiesProperties(type, apiData) {
  const config = mergedConfigOfType(type);

  for(const entity of apiData) {
    const uri = entity.id && await UriForkimaiId(config.class, entity.id, config.graph);
    if(uri) {
      let triplesUpdate = [];
      for (const { predicate, type, kimaiField } of Object.values(config.attributes)) {
        triplesUpdate.push([
          `<${uri}>`,
          `${predicate}`,
          entity[kimaiField] != null? `${sparqlEscape(entity[kimaiField], type)}` : undefined,
        ]);
      }
      await replaceTriples(triplesUpdate, config.graph);
    } else {
      let triplesInsert = [];
      const newUuid = uuid();
      const uri = `${config.newResourceBase}${newUuid}`;
      triplesInsert.push(`<${uri}> a ${config.class}`);
      triplesInsert.push(`<${uri}> mu:uuid "${newUuid}"`);
      triplesInsert.push(`<${uri}> ext:kimaiId "${entity.id}"`);
      for(const {predicate, type, kimaiField} of Object.values(config.attributes)) {
        if(entity[kimaiField] != null) {
          triplesInsert.push(`<${uri}> ${predicate} ${sparqlEscape(entity[kimaiField], type)}`)
        }
      }
      await insertTriples(triplesInsert, config.graph);
    }
  }
}

export async function updateEntityRelationships(type, apiData) {
  const config = mergedConfigOfType(type);
  for(const entity of apiData) {
    const uri = await UriForkimaiId(config.class, entity.id, config.graph);
    // call `updateEntitiesProperties` first for new entities.
    // TODO: extra "entity creation" code and call it here (and in updateEntitiesProperties) first if uri is undefined.
    if(!uri) continue;
    let triplesUpdate = [];
    for(const {predicate, target, kimaiField, inverse = false} of Object.values(config.relationships)) {
      const uriRelationship = await UriForkimaiId(domainConfigForTarget(target).class, entity[kimaiField], config.graph);
      if (inverse) {
        triplesUpdate.push([`<${uri}>`, `^${predicate}`, `<${uriRelationship}>`]);
      }else {
        triplesUpdate.push([`<${uri}>`, `${predicate}`, `<${uriRelationship}>`]);
      }
    }
    await replaceTriples(triplesUpdate, config.graph);
  }
}

export async function insertTriples(tripleStrings, graph) {
  const query = `${PREFIXES_SPARQL}
  INSERT DATA {
    GRAPH <${graph}> {
      ${joinAndEnd(tripleStrings, " .\n")}
    }
  }
  `;
  await updateSudo(query);
}

// a list of escaped triples in form [s, p, o]. If o is undefined, no insertion happens
export async function replaceTriples(triples, graph) {
  const triplesEnumerated = triples.map(([s, p, _], index) => `${s} ${p} ?o${index}`);
  const queryDelete = `${PREFIXES_SPARQL}
  DELETE {
    GRAPH <${graph}> {
      ${joinAndEnd(triplesEnumerated, " .\n")}
    }
  } 
  WHERE {
    GRAPH <${graph}> {
      ${triplesEnumerated.map(t => `OPTIONAL { ${t} }`).join("\n")}
    }
  }  
  `
  const queryInsert = `${PREFIXES_SPARQL}
  INSERT DATA {
    GRAPH <${graph}> {
      ${joinAndEnd(triples.filter(spo => !!spo[2]).map((spo) => spo.join(" ")), " .\n")}
    }
  }
  `

  await updateSudo(queryDelete);
  await updateSudo(queryInsert);
}

export async function UriForkimaiId(escapedEntityClassUri, id, graph) {
  const query = `${PREFIXES_SPARQL}
  SELECT ?uri WHERE {
    graph <${graph}> {
      ?uri a ${escapedEntityClassUri} .
      ?uri ext:kimaiId "${id}" .
    }
  } LIMIT 1
  `;
  const result = parseResult(await querySudo(query));
  return result.length > 0 ? result[0].uri : undefined;
}




/**
 * convert results of select query to an array of objects.
 * from https://github.com/lblod/job-controller-service/blob/a42b6e0b6fd8d12fe618d61c8511717dc58a972c/lib/utils.js
 * @method parseResult
 * @return {Array}
 */
export function parseResult( result ) {
  if(!(result.results && result.results.bindings.length)) return [];

  const bindingKeys = result.head.vars;
  return result.results.bindings.map((row) => {
    const obj = {};
    bindingKeys.forEach((key) => {
      if(row[key] && row[key].datatype == 'http://www.w3.org/2001/XMLSchema#integer' && row[key].value){
        obj[key] = parseInt(row[key].value);
      }
      else if(row[key] && row[key].datatype == 'http://www.w3.org/2001/XMLSchema#dateTime' && row[key].value){
        obj[key] = new Date(row[key].value);
      }
      else obj[key] = row[key] ? row[key].value : undefined;
    });
    return obj;
  });
};