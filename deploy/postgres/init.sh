#!/bin/sh
set -eu

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 \
  --command 'CREATE DATABASE pulse_payments;'
psql --username "$POSTGRES_USER" --dbname pulse_products --set ON_ERROR_STOP=1 \
  --file /pulse-schema/products.sql
psql --username "$POSTGRES_USER" --dbname pulse_payments --set ON_ERROR_STOP=1 \
  --file /pulse-schema/payments.sql
