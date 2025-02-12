import { app } from 'mu';
import bodyParser from 'body-parser';
import { startOfMonth } from 'date-fns';
import DeltaHandler from './delta-handler';
import { fetchList, uploadTimesheet } from './kimai';
import { upsertResource } from './import';
import { collectWorkLogs } from './export';
import { API_TOKEN, KIMAI_ENDPOINT } from './constants';

console.log(`Kimai API connection config:
- Endpoint: ${KIMAI_ENDPOINT}
- API Token: ${API_TOKEN}
`);

const deltaHandler = new DeltaHandler();

app.post('/delta', bodyParser.json({ limit: '500mb' }), async function(req, res) {
  deltaHandler.addToDeltaToQueue(req.body);
});

app.post('/sync-from-kimai/customers', async function (req, res) {
  await syncFromKimai('customers');
  res.status(204).send();
});

app.post('/sync-from-kimai/tasks', async function (req, res) {
  await syncFromKimai('projects');
  await syncFromKimai('activities');
  res.status(204).send();
});

app.post('/sync-from-kimai/accounts', async function (req, res) {
  await syncFromKimai('users');
  res.status(204).send();
});

app.post('/sync-to-kimai/work-logs', async function (req, res) {
  const month = parseInt(req.query['month']);
  const year = parseInt(req.query['year']);
  if (isNaN(month) || isNaN(year)) {
    console.log('Month and year query params are required and must be integers');
    res.status(400).send();
  } else {
    console.log(`Exporting work-logs for ${month}/${year}`);
    const firstOfMonth = startOfMonth(new Date(year, month - 1));
    const workLogsPerTimesheet = await collectWorkLogs(firstOfMonth);
    for (const timesheet in workLogsPerTimesheet) {
      try {
        const workLogs = workLogsPerTimesheet[timesheet];
        await uploadTimesheet(workLogs, timesheet);
      } catch (e) {
        const user = workLogsPerTimesheet[timesheet][0]?.user.name;
        console.log(`Failed to upload all work-logs for timesheet ${month}/${year} of user ${user}`);
      }
    }
    res.status(204).send();
  }
});

async function syncFromKimai(type) {
  const list = await fetchList(type);
  console.log(`Fetched ${list.length} ${type}`);
  for (const item of list) {
    await upsertResource(type, item);
  }
}
