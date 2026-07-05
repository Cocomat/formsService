# Railway Deployment

Dieses Repository wird auf Railway am einfachsten als vier Services betrieben:

1. `PostgreSQL` ueber Railway Plugin
2. `formularservice-api` als Node Service
3. `formularservice-web` als Node Service fuer das gebaute React-Frontend
4. `keycloak` als Docker-Service mit eigener PostgreSQL-Datenbank

## API Service

Source: dieses GitHub Repository

Build command:

```sh
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @formularservice/api prisma:generate && pnpm --filter @formularservice/api build
```

Start command:

```sh
pnpm --filter @formularservice/api prisma:deploy && pnpm --filter @formularservice/api start
```

Wichtige Variablen:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
OIDC_ISSUER_URL=https://<dein-oidc-provider>/realms/formularservice
OIDC_AUDIENCE=formularservice-api
PUBLIC_APP_URL=https://<deine-web-domain>
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASSWORD=<smtp-password>
SMTP_FROM=no-reply@<deine-domain>
```

Railway setzt `PORT` automatisch. Die API liest `PORT`, wenn `API_PORT` nicht gesetzt ist.

## Web Service

Source: dieses GitHub Repository

Build command:

```sh
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @formularservice/web build
```

Start command:

```sh
pnpm --filter @formularservice/web start
```

Wichtige Variablen:

```env
VITE_API_URL=https://<deine-api-domain>/api
VITE_OIDC_AUTHORITY=https://<dein-oidc-provider>/realms/formularservice
VITE_OIDC_CLIENT_ID=formularservice-web
```

## Keycloak Service

Source: `infra/keycloak` als Deploy-Root mit `--path-as-root`.

Start:

```sh
railway up ./infra/keycloak --path-as-root --service keycloak
```

Wichtige Variablen:

```env
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=<sicheres-admin-passwort>
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://${{Postgres-JG6X.PGHOST}}:${{Postgres-JG6X.PGPORT}}/${{Postgres-JG6X.PGDATABASE}}
KC_DB_USERNAME=${{Postgres-JG6X.PGUSER}}
KC_DB_PASSWORD=${{Postgres-JG6X.PGPASSWORD}}
KC_HOSTNAME=https://<deine-keycloak-domain>
KC_HOSTNAME_STRICT=false
KC_HTTP_ENABLED=true
KC_PROXY_HEADERS=xforwarded
KC_CACHE=local
JAVA_OPTS_KC_HEAP=-Xms128m -Xmx384m
JAVA_OPTS_APPEND=-XX:MaxMetaspaceSize=192m -Xss512k
```

Der Realm `formularservice` wird beim ersten Start aus `infra/keycloak/realm-export.json` importiert.

## OIDC Redirects

Im OIDC Provider muessen mindestens diese Redirect URIs erlaubt sein:

```text
https://<deine-web-domain>
https://<deine-web-domain>/
https://<deine-web-domain>/*
```

## Nach dem Deploy

- API Health: `https://<deine-api-domain>/api/health`
- Swagger: `https://<deine-api-domain>/docs`
- Web: `https://<deine-web-domain>`
- Keycloak Discovery: `https://<deine-keycloak-domain>/realms/formularservice/.well-known/openid-configuration`
