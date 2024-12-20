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

## Reference
### Configuration
The following environment variables must be configured:
- **API_TOKEN**: secret API token for the Kimai API
- **KIMAI_ENDPOINT**: URL of the Kimai API endpoint. Make sure to use `https` as protocol and end the URL with `/api`

The following environment variables may be configured:
- **RESOURCE_BASE_URI**: base URI for resource created by this service. Default: `http://timekeeper.redpencil.io`.
- **WORKSPACE_URI**: URI of the workspace (concept-scheme) the synced projects/activities belong to. Default: `http://timekeeper.redpencil.io/workspaces/7530c9c9-4905-4fae-b63f-7a8d29232377`.
- **KIMAI_ACCOUNT_SERVICE_HOMEPAGE**: URL of the Kimai account service homepage. Default: `http://kimai.redpencil.io`.

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

#### POST /sync-to-kimai/work-logs?month=9&year=2024
Sync work logs for a given month/year from Timekeeper to Kimai. Month number is 1-based.

Worklogs are only exported if the timesheet for the given month has been submitted by the user and the worklog has not been exported before.

If all worklogs of a timesheet are successfully exported the status of the timesheet is updated to 'exported'. Failure of exporting one timesheet does not make the other fail.

Returns status 204 No Content on success.
