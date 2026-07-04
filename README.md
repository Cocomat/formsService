# FormularService 2.0 - V1

Produktiv nutzbarer V1-Kern fuer einen mandantenfaehigen Formularservice:

- OIDC Login und rollenbasierte Projektberechtigungen
- Projektverwaltung inklusive Einladungen
- Form.io Formularverwaltung mit Draft/Published-Versionen
- Mehrsprachige Projekt- und Formulardaten
- Publikation per oeffentlichem Link oder Einladung
- versionierte Einreichungen mit CSV/Excel-Export
- REST API mit Projekt-API-Keys, einfachem Rate Limit und Audit Trail
- Docker Compose fuer PostgreSQL, Keycloak und SMTP-Testserver

## Entwicklung

```powershell
pnpm install
Copy-Item .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm dev
```

API: `http://localhost:3000/api`

Frontend: `http://localhost:5173`

Swagger/OpenAPI: `http://localhost:3000/docs`

Mailhog: `http://localhost:8025`

Keycloak: `http://localhost:8080` (`admin` / `admin`)

Lokaler FormularService-Testnutzer:

Der Realm-Export enthaelt bewusst keinen Benutzer mit festem Passwort. Lege im
Keycloak-Admin UI einen lokalen Benutzer an und gib ihm die Realm-Rolle
`service-admin`.

## V1-Modell

Die zentrale Kette ist bewusst schlank gehalten:

`Tenant -> Project -> Form -> FormVersion -> FormPublication -> Submission`

Zusaetzlich gibt es `ProjectUser`, `Invitation`, `ApiKey` und `AuditLog`.

## Nicht in V1

SAML, Webhooks, PDF-Generierung, komplexe Workflows, feldbasierte Berechtigungen, Abrechnung und vollstaendiges Branding sind bewusst nicht enthalten.
