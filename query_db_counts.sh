#!/usr/bin/env bash

# Use sqlite3 command-line tool to query the database

cd "$(dirname "$0")" || exit

echo "Database file: $(pwd)/./pharmacy.db"

# Query for table names
echo ""
echo "--- Tables ---"
sqlite3 "./pharmacy.db" ".tables"

# Query for record counts
echo ""
echo "--- Record Counts per Table ---"
sqlite3 "./pharmacy.db" "
SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;
" | while read -r table; do
    count=$(sqlite3 "./pharmacy.db" "SELECT COUNT(*) FROM \"$table\";)
    echo "$table: $count records"
done