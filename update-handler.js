import { query, update, sparqlEscapeUri, sparqlEscapeString } from 'mu';
import PQueue from 'p-queue';
import { deleteKimaiTimesheet, patchKimaiTimesheet, postKimaiTimesheet } from './kimai';
import { SPARQL_PREFIXES, KIMAI_ACCOUNT_SERVICE_HOMEPAGE } from './constants';

function isRelevantDeltaTriple(triple) {
  if (triple.predicate.value == 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
    && triple.object.value == 'http://www.w3.org/2002/12/cal/ical#Vevent')
    return true;
  else if ([
    'http://www.w3.org/2002/12/cal/ical#duration',
    'http://www.w3.org/2002/12/cal/ical#dtstart',
    'http://www.w3.org/ns/prov#wasAssociatedWith',
    'http://purl.org/dc/terms/subject',
  ].includes(triple.predicate.value))
    return true;
  else
    return false;
}

export async function fetchWorkLogById(workLogId) {
  const result = await query(`
    ${SPARQL_PREFIXES}
    SELECT ?uri
    WHERE {
      ?uri a cal:Vevent ; mu:uuid ${sparqlEscapeString(workLogId)} .
    } LIMIT 1`);

  return result.results.bindings[0]?.['uri'].value
}

export default class UpdateHandler {
  constructor() {
    this.workLogsInQueue = new Set(); // a unique set of URIs that is currently scheduled in this.queue
    this.queue = new PQueue({ concurrency: 1, autoStart: true });

    this.queue.on('idle', () => {
      console.log("Delta handling queue is idle. Waiting for new delta's...");
    })
  }

  updateTask(workLogUri) {
    return () => {
      this.workLogsInQueue.delete(workLogUri);
      return handle(workLogUri);
    };
  }

  addWorkLogToQueue(workLog) {
    if (this.workLogsInQueue.has(workLog)) {
      console.log(`Work log <${workLog}> is already scheduled in the queue`);
    } else {
      console.log(`Work log <${workLog}> is added to the delta handler queue`);
      this.workLogsInQueue.add(workLog);
      this.queue.add(this.updateTask(workLog));
    }
  }

  addDeltaToQueue(changeSets) {
    // Retrieve a unique set of relevant URIs that are not scheduled yet
    // from the delta message
    const newWorkLogsForQueue = [];
    changeSets
      .map((changeSet) => [...changeSet.inserts, ...changeSet.deletes])
      .flat()
      .filter(isRelevantDeltaTriple)
      .forEach((triple) => {
        const workLog = triple.subject.value;
        if (!this.workLogsInQueue.has(workLog)) {
          this.workLogsInQueue.add(workLog);
          newWorkLogsForQueue.push(workLog);
        }
      });

    if (newWorkLogsForQueue.length) {
      // Add an update task for each relevant URI to the queue
      console.log(`${newWorkLogsForQueue.length} new items from delta message are added to the delta handler queue`);
      newWorkLogsForQueue.forEach((workLog) => {
         this.queue.add(this.updateTask(workLog));
      });
    } else {
      // No relevant URIs to add to the queue
    }
  }
}

async function handle(uri) {
  try {
    console.log(`Start handling item <${uri}>`);

    const result = await query(`
      ${SPARQL_PREFIXES}
      SELECT *
      WHERE {
        ${sparqlEscapeUri(uri)} a cal:Vevent ; ?p ?o .
      } LIMIT 1`);

    if (result.results.bindings.length) {
      // Work log exists in triplestore.
      const workLog = await fetchWorkLog(uri);
      const logMessage = `[${workLog.date}] ${workLog.duration} on Kimai activity ${workLog.task.kimaiId} of project ${workLog.task.parent.kimaiId} (URI: ${workLog.uri})`;
      if (workLog.kimaiId) {
        console.log(`UPDATE ${logMessage}`);
        await patchKimaiTimesheet(workLog);
      } else {
        console.log(`CREATE ${logMessage}`);
        const uploadedWorkLog = await postKimaiTimesheet(workLog);
        await insertKimaiId(uploadedWorkLog);
      }
    } else {
      // Work log no longer exists in triplestore.
      // We may need to remove it from Kimai and cleanup remaining triples.
      const kimaiId = await fetchKimaiId(uri);
      if (kimaiId) {
        console.log(`DELETE timesheet ${kimaiId} for worklog <${uri}> from Kimai`);
        await deleteKimaiTimesheet({ uri, kimaiId });
        await update(`
          ${SPARQL_PREFIXES}
          DELETE {
            ${sparqlEscapeUri(uri)} dct:identifier ?kimaiId .
          } WHERE {
            ${sparqlEscapeUri(uri)} dct:identifier ?kimaiId .
          }`);
      } else {
        console.log(`No Kimai sync required for <${uri}>. This is probably not a work log.`);
      }
    }
  } catch (e) {
    console.log(`Something went wrong handling <${uri}>`);
    console.log(e);
  }
}

async function fetchKimaiId(uri) {
  const result = await query(`
    ${SPARQL_PREFIXES}
    SELECT ?kimaiId
    WHERE {
      ${sparqlEscapeUri(uri)} dct:identifier ?kimaiId .
    } LIMIT 1`);
  return result.results.bindings[0]?.['kimaiId']?.value;
}

async function insertKimaiId(workLog) {
  await update(`
    ${SPARQL_PREFIXES}
    INSERT DATA {
      ${sparqlEscapeUri(workLog.uri)} dct:identifier ${sparqlEscapeString(workLog.kimaiId)} .
    }
  `);
}

async function fetchWorkLog(uri) {
  const result = await query(`
    ${SPARQL_PREFIXES}
    SELECT DISTINCT ?duration ?date ?task ?user ?kimaiTimesheetId ?kimaiActivityId ?parentTask ?kimaiProjectId ?kimaiUserId
    WHERE {
      ${sparqlEscapeUri(uri)} a cal:Vevent ;
        cal:duration ?duration ;
        cal:dtstart ?date ;
        dct:subject ?task ;
        prov:wasAssociatedWith ?user .
      OPTIONAL { ${sparqlEscapeUri(uri)} dct:identifier ?kimaiTimesheetId . }
      ?task a ext:KimaiActivity ;
        dct:identifier ?kimaiActivityId ;
        skos:broader ?parentTask .
      ?parentTask a doap:Project ;
        dct:identifier ?kimaiProjectId .
      ?user foaf:account ?kimaiAccount .
      ?kimaiAccount a foaf:OnlineAccount ;
        dct:identifier ?kimaiUserId ;
        foaf:accountServiceHomepage ${sparqlEscapeUri(KIMAI_ACCOUNT_SERVICE_HOMEPAGE)} .
    } LIMIT 1
  `);

  const binding = result.results.bindings[0];
  return {
    uri,
    duration: binding['duration']?.value,
    date: binding['date']?.value,
    kimaiId: binding['kimaiTimesheetId']?.value,
    task: {
      uri: binding['task']?.value,
      kimaiId: binding['kimaiActivityId']?.value,
      parent: {
        uri: binding['parentTask']?.value,
        kimaiId: binding['kimaiProjectId']?.value
      },
    },
    user: {
      uri: binding['user']?.value,
      kimaiId: binding['kimaiUserId']?.value
    },
  };
}
