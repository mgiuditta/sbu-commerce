#!/bin/bash
set -e
set -u

function create_database() {
    local database=$1
    echo "Creating database '$database'"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
CREATE DATABASE $database;
GRANT ALL PRIVILEGES ON DATABASE $database TO $POSTGRES_USER;
EOSQL
}

for db in sbu_catalog sbu_orders sbu_cart sbu_pricing sbu_inventory sbu_auth sbu_cms sbu_hotfolder; do
    create_database $db
done
