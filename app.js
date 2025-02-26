import { app } from 'mu';
import bodyParser from 'body-parser';
import { startOfMonth } from 'date-fns';
import UpdateHandler, { fetchWorkLogById, fetchWorkLogByKimaiId } from './update-handler';
import { deleteKimaiTimesheet, fetchList } from './kimai';
import { upsertResource } from './import';
import { uploadTimesheets } from './export';
import { API_TOKEN, KIMAI_ENDPOINT } from './constants';

console.log(`Kimai API connection config:
- Endpoint: ${KIMAI_ENDPOINT}
- API Token: ${API_TOKEN}
`);

const updateHandler = new UpdateHandler();

app.post('/delta', bodyParser.json({ limit: '500mb' }), async function(req, res) {
  updateHandler.addDeltaToQueue(req.body);
  res.status(204).send();
});

app.post('/update-queue/work-logs/:workLogId', async function (req, res) {
  const workLogId = req.params['workLogId'];
  const workLogUri = await fetchWorkLogById(workLogId);
  if (workLogUri) {
    updateHandler.addWorkLogToQueue(workLogUri);
    res.status(202).send();
  } else {
    console.log(`Id '${workLogId}' is not a valid work log id`);
    res.status(400).send();
  }
});

app.put('/kimai-timesheets/:kimaiId', async function (req, res) {
  const kimaiId = req.params['kimaiId'];
  const workLogUri = await fetchWorkLogByKimaiId(kimaiId);
  if (!workLogUri) {
    await deleteKimaiTimesheet({ kimaiId });
    res.status(204).send();
  } else {
    res.status(204).send();
  }
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
    await uploadTimesheets(firstOfMonth);
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
