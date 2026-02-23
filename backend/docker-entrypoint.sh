#!/bin/sh
set -e

echo "Running database migrations..."
node backend/dist/adapter/outbound/persistence/run-migrations.js

echo "Starting server..."
exec node backend/dist/main.js
