import { app } from 'mu';
import { fetchList } from './kimai';
import { upsertResource } from './import';
import { API_TOKEN, KIMAI_ENDPOINT } from './constants';

console.log(`Kimai API connection config:
- Endpoint: ${KIMAI_ENDPOINT}
- API Token: ${API_TOKEN}
`);

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

async function syncFromKimai(type) {
  const list = await fetchList(type);
  console.log(`Fetched ${list.length} ${type}`);
  for (const item of list) {
    await upsertResource(type, item);
  }
}
