#!/bin/bash
echo "Testing dev1 login..."
curl -s -X POST http://localhost:3001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"dev1","password":"dev123"}'
echo ""

echo "Testing admin login..."
curl -s -X POST http://localhost:3001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"dev123"}'
echo ""

echo "Testing client1 login..."
curl -s -X POST http://localhost:3001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"client1","password":"dev123"}'
echo ""
