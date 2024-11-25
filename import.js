import { uuid, query, update, sparqlEscapeString, sparqlEscapeUri } from 'mu';
import { RESOURCE_BASE_URI, WORKSPACE_URI, KIMAI_ACCOUNT_SERVICE_HOMEPAGE } from './constants';

const SPARQL_PREFIXES = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX ui: <http://www.w3.org/ns/ui#>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX wf: <http://www.w3.org/2005/01/wf/flow#>
  PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
`

export function upsertResource(type, kimaiResource) {
  if (type == 'customers') {
    return upsertCustomer(kimaiResource);
  } else if (type == 'projects') {
    return upsertProject(kimaiResource);
  } else if (type == 'activities') {
    return upsertActivity(kimaiResource);
  } else if (type == 'users') {
    return upsertUser(kimaiResource);
  } else {
    throw new Error(`Unsupported resource type ${type}`);
  }
}

async function upsertUser(kimaiUser) {
  const account = await ensureKimaiResource('foaf:OnlineAccount', 'accounts', kimaiUser.id);

  if (account.isNew) {
    console.log(`Account with Kimai ID ${account.kimaiId} not found in triplestore. Going to create a new one.`);
    await update(`
      ${SPARQL_PREFIXES}
      INSERT DATA {
        ${sparqlEscapeUri(account.uri)} a foaf:OnlineAccount ;
          mu:uuid ${sparqlEscapeString(account.uuid)} ;
          foaf:accountName ${sparqlEscapeString(kimaiUser.username)} ;
          foaf:accountServiceHomepage ${sparqlEscapeUri(KIMAI_ACCOUNT_SERVICE_HOMEPAGE)} .
      }
    `);
  } else {
    console.log(`Account with Kimai ID ${account.kimaiId} already exists.`);
  }
}

async function upsertActivity(kimaiActivity) {
  const activity = await ensureKimaiResource('wf:Task', 'tasks', kimaiActivity.id)

  if (activity.isNew) {
    console.log(`Activity with Kimai ID ${activity.kimaiId} not found in triplestore. Going to create a new one.`);
    await update(`
      ${SPARQL_PREFIXES}
      INSERT DATA {
        ${sparqlEscapeUri(activity.uri)} a wf:Task ;
          mu:uuid ${sparqlEscapeString(activity.uuid)} ;
          rdfs:label ${sparqlEscapeString(kimaiActivity.name)} ;
          dct:identifier ${sparqlEscapeString(activity.kimaiId)} ;
          skos:inScheme ${sparqlEscapeUri(WORKSPACE_URI)} .
        ${colorStatement(activity.uri, kimaiActivity.color)}
      }
    `);

    // Relate activity to project
    if (kimaiActivity.project) {
      const project = await findKimaiResource('wf:Task', kimaiActivity.project);
      if (project) {
        await update(`
          ${SPARQL_PREFIXES}
          INSERT DATA {
            ${sparqlEscapeUri(activity.uri)} skos:broader ${sparqlEscapeUri(project.uri)} .
          }
        `);
      } else {
        console.log(`Unable to link activity ${activity.kimaiId} to project ${kimaiActivity.project} since project is not available in triplestore.`);
      }
    }
  } else {
    console.log(`Activity with Kimai ID ${activity.kimaiId} already exists. Going to update name and color.`);
    await update(`
      ${SPARQL_PREFIXES}
      DELETE {
        ${sparqlEscapeUri(activity.uri)} rdfs:label ?name ;
          ui:color ?color .
      } INSERT {
        ${sparqlEscapeUri(activity.uri)} rdfs:label ${sparqlEscapeString(kimaiActivity.name)} .
        ${colorStatement(activity.uri, kimaiActivity.color)}
      } WHERE {
        ${sparqlEscapeUri(activity.uri)} a wf:Task ;
          rdfs:label ?name .
        OPTIONAL { ${sparqlEscapeUri(activity.uri)} ui:color ?color . }
      }
    `);
  }
}

async function upsertProject(kimaiProject) {
  const project = await ensureKimaiResource('wf:Task', 'tasks', kimaiProject.id)

  if (project.isNew) {
    console.log(`Project with Kimai ID ${project.kimaiId} not found in triplestore. Going to create a new one.`);
    await update(`
      ${SPARQL_PREFIXES}
      INSERT DATA {
        ${sparqlEscapeUri(project.uri)} a wf:Task ;
          mu:uuid ${sparqlEscapeString(project.uuid)} ;
          rdfs:label ${sparqlEscapeString(kimaiProject.name)} ;
          dct:identifier ${sparqlEscapeString(project.kimaiId)} ;
          skos:topConceptOf ${sparqlEscapeUri(WORKSPACE_URI)} ;
          skos:inScheme ${sparqlEscapeUri(WORKSPACE_URI)} .
        ${colorStatement(project.uri, kimaiProject.color)}
      }
    `);

    // Relate project to customer
    if (kimaiProject.customer) {
      const customer = await findKimaiResource('prov:Organization', kimaiProject.customer);
      if (customer) {
        await update(`
          ${SPARQL_PREFIXES}
          INSERT DATA {
            ${sparqlEscapeUri(project.uri)} prov:wasAttributedTo ${sparqlEscapeUri(customer.uri)} .
          }
        `);
      } else {
        console.log(`Unable to link project ${project.kimaiId} to customer ${kimaiProject.customer} since customer is not available in triplestore.`);
      }
    }
  } else {
    console.log(`Project with Kimai ID ${project.kimaiId} already exists. Going to update name and color.`);
    await update(`
      ${SPARQL_PREFIXES}
      DELETE {
        ${sparqlEscapeUri(project.uri)} rdfs:label ?name ;
          ui:color ?color .
      } INSERT {
        ${sparqlEscapeUri(project.uri)} rdfs:label ${sparqlEscapeString(kimaiProject.name)} .
        ${colorStatement(project.uri, kimaiProject.color)}
      } WHERE {
        ${sparqlEscapeUri(project.uri)} a wf:Task ;
          rdfs:label ?name .
        OPTIONAL { ${sparqlEscapeUri(project.uri)} ui:color ?color . }
      }
    `);
  }
}

async function upsertCustomer(kimaiCustomer) {
  const customer = await ensureKimaiResource('prov:Organization', 'customers', kimaiCustomer.id)

  if (customer.isNew) {
    console.log(`Customer with Kimai ID ${customer.kimaiId} not found in triplestore. Going to create a new one.`);
    await update(`
      ${SPARQL_PREFIXES}
      INSERT DATA {
        ${sparqlEscapeUri(customer.uri)} a prov:Organization ;
          mu:uuid ${sparqlEscapeString(customer.uuid)} ;
          rdfs:label ${sparqlEscapeString(kimaiCustomer.name)} ;
          dct:identifier ${sparqlEscapeString(customer.kimaiId)} .
        ${colorStatement(customer.uri, kimaiCustomer.color)}
      }
    `);
  } else {
    console.log(`Customer with Kimai ID ${customer.kimaiId} already exists. Going to update name and color.`);
    await update(`
      ${SPARQL_PREFIXES}
      DELETE {
        ${sparqlEscapeUri(customer.uri)} rdfs:label ?name ;
          ui:color ?color .
      } INSERT {
        ${sparqlEscapeUri(customer.uri)} rdfs:label ${sparqlEscapeString(kimaiCustomer.name)} .
        ${colorStatement(customer.uri, kimaiCustomer.color)}
      } WHERE {
        ${sparqlEscapeUri(customer.uri)} a prov:Organization ;
          rdfs:label ?name .
        OPTIONAL { ${sparqlEscapeUri(customer.uri)} ui:color ?color . }
      }
    `);
  }
}


async function findKimaiResource(rdfType, kimaiId) {
  const kimaiIdStr = `${kimaiId}`;
  const result = await query(`
    ${SPARQL_PREFIXES}
    SELECT ?uri ?uuid
    WHERE {
      ?uri a ${rdfType} ;
        mu:uuid ?uuid ;
        dct:identifier ${sparqlEscapeString(kimaiIdStr)} .
    } LIMIT 1
  `);

  if (result.results.bindings.length) {
    return {
      uri: result.results.bindings[0]['uri'].value,
      uuid: result.results.bindings[0]['uuid'].value,
      kimaiId: kimaiIdStr,
    };
  } else {
    return null;
  }
}

async function ensureKimaiResource(rdfType, resourceType, kimaiId) {
  const resource = await findKimaiResource(rdfType, kimaiId);

  if (resource) {
    return {
      ...resource,
      isNew: false
    };
  } else {
    const id = uuid();
    return {
      uri: `${RESOURCE_BASE_URI}/${resourceType}/${id}`,
      uuid: id,
      kimaiId: `${kimaiId}`,
      isNew: true
    };
  }
}

function colorStatement(subject, color) {
  if (color) {
    return `${sparqlEscapeUri(subject)} ui:color ${sparqlEscapeString(color)} .`
  } else {
    return '';
  }
}
