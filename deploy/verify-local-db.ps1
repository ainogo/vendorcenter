$env:ENV_FILE = "backend/.env.example"
Set-Location backend
node ./node_modules/tsx/dist/cli.mjs src/scripts/db-health.ts
