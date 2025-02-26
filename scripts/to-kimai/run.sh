#!/bin/sh
echo ""
echo "Check docker logs to follow up on sync process"

START="$1"
END="$2"

if [[ "$START" == "" ]]
then
    echo "Must supply start date in format yyyy-MM-dd"
elif [[ "$END" == "" ]]
then
    echo "Must supply end date in format yyyy-MM-dd"
else
    body="{ \"start\": \"$START\", \"end\": \"$END\" }"
    curl -X POST -H "Content-Type: application/vnd.api+json" -d "$body" "http://kimai-sync/sync-to-kimai/work-logs"
fi
