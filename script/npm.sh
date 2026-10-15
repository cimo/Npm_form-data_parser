#!/bin/bash

rm -rf "node_modules/" "package-lock.json"

if ! npm install
then
    echo -e "\n❌ npm.sh - npm install failed."

    exit 1
fi

npm run build
