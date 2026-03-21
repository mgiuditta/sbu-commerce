# Roadmap SBU Commerce — Struttura Completa

## Context

Il progetto è in fase iniziale. Solo il catalog-service ha implementazione reale (Product CRUD). Gli altri 7 servizi, 4 extensions e 2 frontend sono scaffold vuoti. L'infrastruttura Docker è pronta (PostgreSQL, RabbitMQ, Redis, Meilisearch, MinIO). Serve una roadmap per capire in che ordine costruire tutto.

---

## Fase 1 — Fondamenta (estensioni core + codegen)

**Obiettivo:** Avere il type system funzionante come source of truth.

### 1.1 Extension `core` — items.json con tipi base
- `GenericItem` (base per tutti i tipi)
- `Media` (url, mimeType, size, altText)
- `Language` (isoCode, name, active)
- `Currency` (isoCode, symbol, name, digits)
- `Country` (isoCode, name)
- `Unit` (code, name, unitType)

### 1.2 Extension `commerce` — items.json con tipi commerce
- `Cart`, `CartEntry`
- `Order`, `OrderEntry`, `OrderStatus` (enum)
- `PriceRow`, `Discount`, `Tax`
- `PaymentMode`, `DeliveryMode`
- `Address` (shipping/billing)

### 1.3 Extension `b2b`
- `B2BUnit`, `B2BCustomer`, `B2BBudget`
- `CostCenter`, `PurchaseOrderApproval`

### 1.4 Validare il codegen
- Popolare tutti gli items.json
- Eseguire `pnpm run generate`
- Verificare che genera domain models, entities, DTOs, mappers corretti per tutti i servizi

---

## Fase 2 — Auth Service (prerequisito per tutto il resto)

**Obiettivo:** Autenticazione e autorizzazione funzionanti.

- Domain: `User`, `Role`, `Permission`, `Tenant`
- JWT access + refresh token (`@nestjs/passport`, `@nestjs/jwt`)
- Registrazione, login, logout, refresh
- RBAC (Role-Based Access Control)
- Tenant registry (multi-tenant)
- Guard condiviso per API Gateway

---

## Fase 3 — Catalog Service (completare)

**Obiettivo:** Servizio catalogo completo, non solo Product.

- Completare Category CRUD (ports, service, adapter, controller)
- Completare CatalogVersion CRUD
- Relazioni: Product ↔ Category (many-to-many), Product/Category ↔ CatalogVersion
- Staging/Online versioning (draft → publish)
- Ricerca prodotti via Meilisearch (sync automatico)
- Import bulk via RabbitMQ (riceve da hotfolder-service)

---

## Fase 4 — Pricing Service

**Obiettivo:** Listini prezzo e regole di sconto.

- Domain: `PriceRow`, `PriceList`, `DiscountRule`, `Tax`
- Calcolo prezzo per prodotto + catalog version
- Sconti condizionali (quantità, utente, periodo)
- API RMQ: `pricing.calculate` (request/reply dal cart-service)

---

## Fase 5 — Inventory Service

**Obiettivo:** Gestione stock multicanale.

- Domain: `StockLevel`, `Warehouse`, `Reservation`
- Stock per warehouse + prodotto
- Reservation temporanea (durante checkout)
- Eventi: `stock.updated`, `stock.reserved`, `stock.released`

---

## Fase 6 — Cart Service

**Obiettivo:** Carrello con calcolo prezzi in tempo reale.

- Domain: `Cart`, `CartEntry`
- Sessione utente (anonimo + autenticato)
- Aggiunta/rimozione/aggiornamento quantità
- Calcolo totale via pricing-service (RMQ)
- Verifica disponibilità via inventory-service (RMQ)
- Promozioni applicate

---

## Fase 7 — Order Service

**Obiettivo:** Ordini con state machine.

- Domain: `Order`, `OrderEntry`, `OrderStatus`
- State machine con xstate: CREATED → PAYMENT_PENDING → PAID → SHIPPED → DELIVERED / CANCELLED
- Order splitting (più warehouse → più spedizioni)
- Saga: cart → order → payment → inventory reservation
- Compensating transactions su fallimento

---

## Fase 8 — Hotfolder Service

**Obiettivo:** Import CSV/file automatico.

- chokidar file watcher su directory configurabile
- BullMQ pipeline: validate → transform → import → archive
- Import prodotti, categorie, prezzi, stock via RMQ
- Logging job con stato (success/error)
- Processor sovrascrivibili da extension

---

## Fase 9 — CMS Service (Payload CMS)

**Obiettivo:** CMS per gestione contenuti storefront.

- Payload CMS 3.x embedded in Next.js
- Collections: Pages, Blocks, Media
- Visual editor con live preview
- Draft/Publish (staging/online)
- Access control per tenant

---

## Fase 10 — Cronjob Extension

**Obiettivo:** Framework di scheduling riusabile da tutti i servizi.

### Struttura: `extensions/cronjob/`

Perché **extension** e non servizio:
- Lo scheduling è una capability cross-cutting, non un dominio di business
- Ogni servizio registra i propri job
- L'extension fornisce: decoratori, logging, retry, monitoring

### items.json
- `CronJob` (name, expression, serviceTarget, status, lastRun, nextRun, enabled)
- `CronJobLog` (jobName, startedAt, finishedAt, status, error)
- `CronJobStatus` enum: IDLE, RUNNING, SUCCESS, FAILED

### Funzionalità
- Basato su `@nestjs/schedule` (ScheduleModule)
- Decoratore custom `@SbuCron(name, expression)` che wrappa `@Cron()` con:
  - Logging automatico in CronJobLog
  - Lock distribuito via Redis (no doppia esecuzione in cluster)
  - Retry con exponential backoff
  - Toggle enable/disable da DB
- Dashboard API per backoffice: lista job, ultimo run, toggle on/off
- Ogni servizio importa `CronjobExtension.register()` e usa `@SbuCron()`

---

## Fase 11 — API Gateway (completare)

- Proxy routes per tutti i servizi
- Auth guard globale (JWT)
- Rate limiting
- Request logging con trace correlation
- Swagger/OpenAPI aggregato

---

## Fase 12 — Frontend

### Storefront (Next.js 15)
- Product listing + detail page
- Cart page
- Checkout flow
- Auth (login/register)
- CMS pages

### Backoffice (Next.js 15)
- Product management
- Order management
- Inventory dashboard
- CMS editor (Payload)
- Cronjob monitoring
- Tenant management

---

## Ordine di priorità consigliato

```
1. core items.json + codegen validation     ← type system funzionante
2. auth-service                             ← prerequisito per sicurezza
3. catalog-service (completare)             ← dominio principale
4. pricing-service                          ← serve al cart
5. inventory-service                        ← serve al cart
6. cart-service                             ← serve all'order
7. order-service                            ← core business
8. cronjob extension                        ← cross-cutting, utile ovunque
9. hotfolder-service                        ← import automatico
10. cms-service                             ← contenuti
11. api-gateway (completare)                ← routing + security
12. storefront + backoffice                 ← frontend
```

---

## File critici da modificare/creare per la Fase 10 (Cronjob Extension)

```
extensions/cronjob/
├── extension.json
├── items.json                    ← CronJob, CronJobLog, CronJobStatus
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  ← CronjobExtension module
│   ├── domain/
│   │   ├── models/               ← CronJob, CronJobLog (generati da codegen)
│   │   ├── ports/
│   │   │   ├── inbound/          ← CronJobServicePort
│   │   │   └── outbound/         ← CronJobRepositoryPort
│   │   └── services/             ← CronJobService
│   ├── adapters/
│   │   ├── inbound/
│   │   │   └── rest/             ← CronJobController (API per backoffice)
│   │   └── outbound/
│   │       ├── persistence/      ← CronJobTypeOrmAdapter
│   │       └── redis/            ← DistributedLockAdapter
│   ├── decorators/
│   │   └── sbu-cron.decorator.ts ← @SbuCron() custom decorator
│   └── infrastructure/
│       ├── typeorm/              ← Entities (generati)
│       └── config/
```

## Verifica

- `pnpm run generate` — codegen senza errori
- `npx tsc --noEmit` nel servizio — zero errori TS
- `pnpm dev` — tutti i servizi partono
- Bruno collection — test CRUD funzionanti
