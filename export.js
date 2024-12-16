import { query, update, sparqlEscapeDate, sparqlEscapeUri, sparqlEscapeString } from 'mu';
import { SPARQL_PREFIXES, TIMESHEET_STATUSES, KIMAI_ACCOUNT_SERVICE_HOMEPAGE } from './constants';
import { addMonths, startOfMonth } from 'date-fns';

export async function collectWorkLogs(startDate) {
  const result = await query(`
    ${SPARQL_PREFIXES}

    SELECT ?timesheet ?status ?user ?userName
    WHERE {
      ?timesheet a skos:Collection ;
        time:hasBeginning ${sparqlEscapeDate(startDate)} ;
        adms:status ?status ;
        prov:wasAssociatedWith ?user .
      ?user foaf:name ?userName .
    }
  `);
  const timesheets = result.results.bindings.map((binding) => {
    return {
      uri: binding['timesheet']?.value,
      status: binding['status']?.value,
      user: {
        uri: binding['user']?.value,
        name: binding['userName']?.value,
      }
    }
  });

  const draft = timesheets.filter((timesheet) => timesheet.status == TIMESHEET_STATUSES.DRAFT);
  const absence = timesheets.filter((timesheet) => timesheet.status == TIMESHEET_STATUSES.ABSENCE_SUBMITTED);
  const submitted = timesheets.filter((timesheet) => timesheet.status == TIMESHEET_STATUSES.SUBMITTED);
  const exported = timesheets.filter((timesheet) => timesheet.status == TIMESHEET_STATUSES.EXPORTED);

  if (draft.length || absence.length) {
    const timesheets = [...draft, ...absence];
    console.log(`\n${timesheets.length} timesheets are not submitted yet by the user. They will not be exported to Kimai.`);
    console.log(`Status DRAFT:`)
    console.log(draft.map((timesheet) => `\t${timesheet.user.name} (URI: ${timesheet.uri})`).join('\n'));
    console.log(`Status ABSENCE_SUBMITTED:`)
    console.log(absence.map((timesheet) => `\t${timesheet.user.name} (URI: ${timesheet.uri})`).join('\n'));
  }

  if (exported.length) {
    console.log(`\n${exported.length} timesheets are already exported before. They will not be exported again to Kimai.`);
    console.log(`Status EXPORTED:`)
    console.log(exported.map((timesheet) => `\t${timesheet.user.name} (URI: ${timesheet.uri})`).join('\n'));
  }

  if (submitted.length) {
    console.log(`\n${submitted.length} timesheets will be exported to Kimai.`);
    console.log(`Status SUBMITTED:`)
    console.log(submitted.map((timesheet) => `\t${timesheet.user.name} (URI: ${timesheet.uri})`).join('\n'));

    const startNextMonth = startOfMonth(addMonths(startDate, 1));
    const workLogsPerTimesheet = {};
    for (const timesheet of submitted) {
      const workLogs = [];
      const result = await query(`
        ${SPARQL_PREFIXES}
        SELECT DISTINCT ?workLog ?duration ?date ?task ?kimaiActivityId ?parentTask ?kimaiProjectId ?kimaiUserId
        WHERE {
          ?workLog a cal:Vevent ;
            cal:duration ?duration ;
            cal:dtstart ?date ;
            dct:subject ?task ;
            prov:wasAssociatedWith ${sparqlEscapeUri(timesheet.user.uri)} .
          FILTER NOT EXISTS { ?workLog dct:identifier ?kimaiId . }
          FILTER (?date >= ${sparqlEscapeDate(startDate)} && ?date < ${sparqlEscapeDate(startNextMonth)})
          ?task a ext:KimaiActivity ;
            dct:identifier ?kimaiActivityId ;
            skos:broader ?parentTask .
          ?parentTask a doap:Project ;
            dct:identifier ?kimaiProjectId .
          ${sparqlEscapeUri(timesheet.user.uri)} foaf:account ?kimaiAccount .
          ?kimaiAccount a foaf:OnlineAccount ;
            dct:identifier ?kimaiUserId ;
            foaf:accountServiceHomepage ${sparqlEscapeUri(KIMAI_ACCOUNT_SERVICE_HOMEPAGE)} .
        } ORDER BY ?date
      `);

      result.results.bindings.forEach((binding) => {
        workLogs.push({
          uri: binding['workLog']?.value,
          duration: binding['duration']?.value,
          date: binding['date']?.value,
          task: {
            uri: binding['task']?.value,
            kimaiId: binding['kimaiActivityId']?.value,
            parent: {
              uri: binding['parentTask']?.value,
              kimaiId: binding['kimaiProjectId']?.value
            },
          },
          user: {
            ...timesheet.user,
            kimaiId: binding['kimaiUserId']?.value
          },
          timesheet
        });
      });

      workLogsPerTimesheet[timesheet.uri] = workLogs;
    }
    return workLogsPerTimesheet;
  } else {
    console.log(`\nStatus SUBMITTED:`)
    console.log(`\tNo submitted timesheets found for ${startDate.getMonth() + 1}/${startDate.getFullYear()}. Nothing will be exported.`);
    return [];
  }
}

export async function updateWorkLogStatus(workLog) {
  await update(`
    ${SPARQL_PREFIXES}
    INSERT DATA {
      ${sparqlEscapeUri(workLog.uri)} dct:identifier ${sparqlEscapeString(workLog.kimaiId)} .
      ${sparqlEscapeUri(workLog.timesheet.uri)} skos:member ${sparqlEscapeUri(workLog.uri)} .
    }
  `);
}

export async function updateTimesheetStatus(timesheet, status) {
  await update(`
    ${SPARQL_PREFIXES}
    DELETE WHERE {
      ${sparqlEscapeUri(timesheet)} adms:status ?status .
    }

    ;

    INSERT DATA {
      ${sparqlEscapeUri(timesheet)} adms:status ${sparqlEscapeUri(status)} .
    }
  `);
}
