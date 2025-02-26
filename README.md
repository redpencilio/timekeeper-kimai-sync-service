# Timekeeper Kimai sync service
Microservice to sync data between Timekeeper and Kimai.

## Getting started
### Adding the service to your stack
Generate an API key in Kimai for a system user.

Add the following snippet to your `docker-compose.yml`
```yml
  kimai-sync:
    image: redpencil/timekeeper-kimai-sync-service
    environment:
      API_TOKEN: "your_secret_kimai_api_token_here"
      KIMAI_ENDPOINT: "https://kimai.redpencil.io/api"
      DEFAULT_MU_AUTH_SCOPE: "http://services.redpencil.io/timekeeper-kimai-sync-service"
```

### Wiring the delta notifier
Add the following rules to the delta notifier in `./config/delta/rules.js`

``` javascript
const rules = [
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
      },
      object: {
        type: 'uri',
        value: 'http://www.w3.org/2002/12/cal/ical#Vevent'
      },
    },
    callback: {
      url: 'http://kimai-sync/delta',
      method: 'POST',
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      foldEffectiveChanges: true,
      ignoreFromSelf: true,
    },
  }
];

[
  'http://www.w3.org/2002/12/cal/ical#duration',
  'http://www.w3.org/2002/12/cal/ical#dtstart',
  'http://www.w3.org/ns/prov#wasAssociatedWith',
  'http://purl.org/dc/terms/subject',
].map((predicate) => {
  rules.push({
    match: {
      predicate: {
        type: 'uri',
        value: predicate
      },
    },
    callback: {
      url: 'http://kimai-sync/delta',
      method: 'POST',
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      foldEffectiveChanges: true,
      ignoreFromSelf: true,
    },
  });
});
```

## Reference
### Configuration
The following environment variables must be configured:
- **API_TOKEN**: secret API token for the Kimai API
- **KIMAI_ENDPOINT**: URL of the Kimai API endpoint. Make sure to use `https` as protocol and end the URL with `/api`

The following environment variables may be configured:
- **FALLBACK_SYNC_CRON**: cron pattern to run fallback synchronization of work logs to Kimai. Default: `0 0 */2 * * *` (every 2 hours).
- **RESOURCE_BASE_URI**: base URI for resource created by this service. Default: `http://timekeeper.redpencil.io`.
- **WORKSPACE_URI**: URI of the workspace (concept-scheme) the synced projects/activities belong to. Default: `http://timekeeper.redpencil.io/workspaces/7530c9c9-4905-4fae-b63f-7a8d29232377`.
- **KIMAI_ACCOUNT_SERVICE_HOMEPAGE**: URL of the Kimai account service homepage. Default: `http://kimai.redpencil.io`.

### Scripts
The service provides scripts to sync data from/to Kimai.

Execute `mu script kimai-sync` to get the documentation.

### API
#### POST /sync-from-kimai/customers
Sync customer records from Kimai to Timekeeper.
On update only the `name` and `color` attributes are updated.

Returns status 204 No Content on success.

#### POST /sync-from-kimai/tasks
Sync project and activity records from Kimai to Timekeeper.
Relations to other resources (customer and/or task hierarchy) are only fetched on creation, not on update.
On update only the `name` and `color` attributes are updated.

Returns status 204 No Content on success.

#### POST /sync-from-kimai/accounts
Sync user records from Kimai to Timekeeper.
Only new users are created. Existing users don't get updated.

Returns status 204 No Content on success.

#### POST /sync-to-kimai/work-logs
Sync work logs for a given period from Timekeeper to Kimai.

Requires a request body like

``` json
{
  "start": "2024-09-01",
  "end": "2024-12-31"
}
```

All work logs found in the triplestore for the given period are synced to Kimai.
All work logs found in Kimai without a counterpart in Timekeeper are removed from Kimai.

Returns status 202 Accepted on success.

#### POST /timesheets/lock
Updates the status of submitted timesheets for a given month to 'exported' and link work logs in the given month to the timesheet.

Requires a request body like

``` json
{
  "month": 9,
  "year": 2024
}
```

Month number is 1-based.

Returns status 204 No Content on success.

#### POST /delta
Handles updates on work logs by syncing the state from Timekeeper to Kimai.

#### POST /update-queue/work-logs/:workLogId
Syncs the work log with the given id from Timekeeper to Kimai.

#### PUT /kimai-timesheets/:kimaiId
Syncs the status of the Kimai timesheet with the given id from Kimai to Timekeeper.
I.e. if a work log can be found in Timekeeper with the related Kimai id, nothing happens. Else the timesheet is removed from Kimai.
