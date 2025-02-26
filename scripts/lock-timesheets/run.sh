#!/bin/sh
echo "Check docker logs to follow up on sync process"

MONTH="$1"
YEAR="$2"

if [[ "$MONTH" == "" ]]
then
    echo "Must supply month"
elif [[ "$YEAR" == "" ]]
then
    echo "Must supply year"
else
    body="{ \"year\": \"$YEAR\", \"month\": \"$MONTH\" }"
    curl -X POST -H "Content-Type: application/vnd.api+json" -d "$body" "http://kimai-sync/timesheets/lock"
fi
