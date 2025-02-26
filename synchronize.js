import { query, sparqlEscapeDate } from 'mu';
import { fetchList } from './kimai';
import { SPARQL_PREFIXES } from './constants';
import { format, formatISO } from 'date-fns';

function formatPeriod(start, end) {
  const startStr = formatISO(start, { representation: 'date' });
  const endStr = formatISO(end, { representation: 'date' });
  return `[${startStr}, ${endStr}]`;
}

export default async function synchronize(start, end) {
  console.log(`Synchronizing work logs to Kimai for period ${formatPeriod(start, end)}`);
  await synchronizeToKimai(start, end);

  console.log(`Cleanup timesheets in Kimai for period ${formatPeriod(start, end)}`);
  await synchronizeFromKimai(start, end);
}

async function synchronizeToKimai(start, end) {
  const result = await query(`
    ${SPARQL_PREFIXES}
    SELECT ?uri ?id
    WHERE {
    ?uri a cal:Vevent ;
    mu:uuid ?id ;
    cal:dtstart ?date .
    FILTER NOT EXISTS { ?uri dct:identifier ?kimaiId . }
    FILTER (?date >= ${sparqlEscapeDate(start)} && ?date <= ${sparqlEscapeDate(end)})
    }`);

  const workLogIds = result.results.bindings.map((binding) => binding['id'].value);
  console.log(`Going to push ${workLogIds.length} work logs on the update queue to be synced to Kimai`);
  for (const workLogId of workLogIds) {
    await fetch(`http://localhost/update-queue/work-logs/${workLogId}`, {
      method: 'POST',
      headers: { Accept: 'application/vnd.api+json' },
    })
  }
}

async function synchronizeFromKimai(start, end) {
  const kimaiTimesheets = await fetchList('timesheets', {
    user: 'all',
    begin: format(start, "yyyy-MM-dd'T'HH:mm:ss"),
    end: format(end, "yyyy-MM-dd'T'HH:mm:ss")
  })

  const kimaiTimesheetIds = kimaiTimesheets.map((timesheet) => `${timesheet.id}`);
  console.log(`Going to validate the existance of ${kimaiTimesheetIds.length} Kimai timesheets in the triplestore`);
  for (const kimaiTimesheetId of kimaiTimesheetIds) {
    await fetch(`http://localhost/kimai-timesheets/${kimaiTimesheetId}`, {
      method: 'PUT',
      headers: { Accept: 'application/vnd.api+json' }
    });
  }
}
