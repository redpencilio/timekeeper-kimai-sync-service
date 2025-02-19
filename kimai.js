import { URLSearchParams } from 'url';
import { add, startOfDay } from 'date-fns';
import { parse as parseDuration } from 'tinyduration';
import { API_TOKEN, KIMAI_ENDPOINT, TIMESHEET_STATUSES } from './constants';
import { updateTimesheetStatus, updateWorkLogStatus } from './export';

const authorizationHeader = `Bearer ${API_TOKEN}`;
const headers = { Authorization: authorizationHeader, accept: 'application/json' };

async function fetchPage(type, page = 0, size = 50, filters = {}) {
  const endpoint = new URL(`${KIMAI_ENDPOINT}/${type}`);
  endpoint.search = new URLSearchParams(Object.assign({ page, size }, filters));
  console.log(`Fetch page ${endpoint.href}`);
  const response = await fetch(endpoint, { headers });

  if (response.ok) {
    return await response.json();
  } else {
    throw new Error(`Failed to fetch page ${page} with size ${size} for type '${type}'.
 Response status: ${response.status}.
 Response body: ${await response.text()}` );
  }
}

export async function fetchList(type) {
  const size = 999; // TODO decrease once pagination is supported by Kimai API
  let pageNumber = 0;
  let isLastPage = false;
  let list = [];

  while (!isLastPage) {
    const page = await fetchPage(type, pageNumber, size);
    isLastPage = page.length < size;
    list = [...list, ...page];
    pageNumber++;
  };

  return list;
}

export async function postKimaiTimesheet(workLog) {
  const begin = startOfDay(Date.parse(workLog.date)).toISOString();
  const end = add(begin, parseDuration(workLog.duration)).toISOString();
  const kimaiTimesheet = {
    begin,
    end,
    project: parseInt(workLog.task.parent.kimaiId),
    activity: parseInt(workLog.task.kimaiId),
    user: parseInt(workLog.user.kimaiId)
  };

  const endpoint = new URL(`${KIMAI_ENDPOINT}/timesheets`);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(kimaiTimesheet)
  });

  if (response.ok) {
    const json =  await response.json();
    const kimaiId = `${json.id}`;
    return Object.assign({}, workLog, { kimaiId });
  } else {
    throw new Error(`Failed to upload work-log ${JSON.stringify(kimaiTimesheet)} to Kimai.
 Response status: ${response.status}.
 Response body: ${await response.text()}` );
  }
}

export async function patchKimaiTimesheet(workLog) {
  const begin = startOfDay(Date.parse(workLog.date)).toISOString();
  const end = add(begin, parseDuration(workLog.duration)).toISOString();
  const kimaiTimesheet = {
    begin,
    end,
    project: parseInt(workLog.task.parent.kimaiId),
    activity: parseInt(workLog.task.kimaiId),
    user: parseInt(workLog.user.kimaiId)
  };

  const endpoint = new URL(`${KIMAI_ENDPOINT}/timesheets/${workLog.kimaiId}`);
  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(kimaiTimesheet)
  });

  if (response.ok) {
    return workLog;
  } else {
    throw new Error(`Failed to update work-log ${JSON.stringify(kimaiTimesheet)} in Kimai.
 Response status: ${response.status}.
 Response body: ${await response.text()}` );
  }
}

export async function deleteKimaiTimesheet(workLog) {
  const endpoint = new URL(`${KIMAI_ENDPOINT}/timesheets/${workLog.kimaiId}`);
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    }
  });

  if (response.ok) {
    return true;
  } else {
    throw new Error(`Failed to remove work-log <${workLog.uri}> with ID ${workLog.kimaiId} from Kimai.
 Response status: ${response.status}.
 Response body: ${await response.text()}` );
  }
}
