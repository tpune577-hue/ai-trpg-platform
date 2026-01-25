#!/usr/bin/env pwsh
# Build script to capture full output
npx next build 2>&1 | Tee-Object -FilePath build-output.txt
