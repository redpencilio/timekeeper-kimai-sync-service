add to docker-compose:
```
  kimai-sync:
    image: kimai-image
    environment:
      API_TOKEN: abc // create one in kimai by pressing your name and choosing "api access"
      KIMAI_ENDPOINT: "https://.kimai.endpoint.com/api" // make sure to use https endpoint and add /api
    volumes:
      - ./config/resources/domain.json:/config/domain.json // this service can work with any domain.json file, as long as it contains all information (including all used prefixes)
      // - ./config/kimai/mapping.json:/config/mapping.json // an example exists in this repo, but this should be transfered to the app-repo instead
```