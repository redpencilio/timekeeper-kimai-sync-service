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
    curl -X POST -H "Content-Type: application/vnd.api+json" "http://kimai-sync/sync-to-kimai/work-logs?month=$MONTH&year=$YEAR"
fi
