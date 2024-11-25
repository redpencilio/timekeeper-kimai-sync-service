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
    volumes:
      - ./config/resources/domain.json:/config/domain.json
      - ./config/kimai/mapping.json:/config/mapping.json
```

## Reference
### Configuration
The following environment variables must be configured:
- **API_TOKEN**: secret API token for the Kimai API
- **KIMAI_ENDPOINT**: URL of the Kimai API endpoint. Make sure to use `https` as protocol and end the URL with `/api`

The following environment variables may be configured:
- **RESOURCE_BASE_URI**: base URI for resource created by this service. Default: `http://timekeeper.redpencil.io`.
- **WORKSPACE_URI**: URI of the workspace (concept-scheme) the synced projects/activities belong to

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
