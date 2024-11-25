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
