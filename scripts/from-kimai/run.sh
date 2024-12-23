#!/bin/sh
echo "Import accounts from Kimai"
curl -X POST http://kimai-sync/sync-from-kimai/accounts
echo "Import customers from Kimai"
curl -X POST http://kimai-sync/sync-from-kimai/customers
echo "Import projects and activities (our tasks) from Kimai"
curl -X POST http://kimai-sync/sync-from-kimai/tasks
echo "DONE"
