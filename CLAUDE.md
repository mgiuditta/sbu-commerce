# Sbu Ecommerce — Istruzioni Architetturali per Claude Code

> Piattaforma Commerce Enterprise su NestJS Microservizi + Next.js
> TypeORM | PostgreSQL | NATS | Hexagonal Architecture | Marzo 2026

---

## Panoramica Progetto

Sbu Ecommerce è una piattaforma commerce enterprise che replica e modernizza SAP Hybris Commerce Cloud con stack TypeScript-first. Architettura a microservizi NestJS con comunicazione NATS, frontend Next.js, ORM TypeORM su PostgreSQL.

**Stack non negoziabile:** NestJS 11 (backend), Next.js 15 (frontend), TypeORM + PostgreSQL, NATS transport.

**Licenza:** BSL 1.1 — codice visibile, uso produzione a pagamento, conversione Apache 2.0 dopo 4 anni.

---

## Architettura: Hexagonal (Ports & Adapters)

Ogni microservizio segue rigorosamente l'architettura esagonale. Il dominio è al centro, zero dipendenze esterne. Le dipendenze puntano SEMPRE verso il centro.

### Struttura standard di un microservizio

```
<service-name>/
├── src/
│   ├── domain/                        ← CORE (zero dipendenze esterne)
│   │   ├── models/                    ← Entity di dominio (plain TS classes, NO decoratori TypeORM)
│   │   ├── ports/
│   │   │   ├── inbound/              ← Use case interfaces (driving ports)
│   │   │   └── outbound/             ← Repository interfaces (driven ports)
│   │   └── services/                  ← Use case implementations (importano SOLO da domain/)
│   ├── adapters/
│   │   ├── inbound/
│   │   │   ├── rest/                  ← NestJS Controllers (HTTP adapter)
│   │   │   │   └── dto/              ← class-validator DTOs (request/response)
│   │   │   └── nats/                  ← NATS @MessagePattern / @EventPattern handlers
│   │   └── outbound/
│   │       ├── persistence/           ← TypeORM Repository implementations
│   │       ├── messaging/             ← NATS ClientProxy adapter
│   │       └── external/              ← HTTP client per servizi esterni
│   ├── infrastructure/
│   │   ├── typeorm/                   ← TypeORM entities (decoratori @Entity, @Column, etc.)
│   │   ├── config/                    ← Configurazione modulo
│   │   └── migrations/               ← TypeORM migrations
│   └── <service-name>.module.ts       ← NestJS Module (wiring DI)
├── items.json                         ← Type system dichiarativo
├── extension.json                     ← Metadati (nome, versione, dipendenze)
├── Dockerfile
└── test/
    ├── unit/                          ← Test domain services (mock delle porte)
    └── integration/                   ← Test adapters con DB reale
```

### Regole INVIOLABILI

1. **domain/ NON importa MAI da adapters/, infrastructure/, o librerie esterne** (no TypeORM, no NestJS decorators nel dominio)
2. **I domain models sono plain TypeScript classes**, non TypeORM entities
3. **Le TypeORM entities vivono in infrastructure/typeorm/** e sono separate dai domain models
4. **I domain services dipendono SOLO da porte (interfacce)**, mai da implementazioni concrete
5. **Gli adapters implementano le porte** e fanno il mapping domain model ↔ TypeORM entity
6. **Il module.ts fa il wiring** — collega interfacce a implementazioni via NestJS DI

### Esempio di porta e adapter

```typescript
// domain/ports/outbound/product.repository.port.ts
export interface ProductRepositoryPort {
  findByCode(code: string): Promise<Product | null>;
  save(product: Product): Promise<Product>;
}

// adapters/outbound/persistence/product.typeorm.adapter.ts
@Injectable()
export class ProductTypeOrmAdapter implements ProductRepositoryPort {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repo: Repository<ProductEntity>,
  ) {}

  async findByCode(code: string): Promise<Product | null> {
    const entity = await this.repo.findOne({ where: { code } });
    return entity ? ProductMapper.toDomain(entity) : null;
  }

  async save(product: Product): Promise<Product> {
    const entity = ProductMapper.toEntity(product);
    const saved = await this.repo.save(entity);
    return ProductMapper.toDomain(saved);
  }
}
```

---

## Microservizi e Database-per-Service

Ogni microservizio possiede il proprio database PostgreSQL. Nessun servizio accede al database di un altro. Comunicazione SOLO via NATS.

| Microservizio | Database | Responsabilità |
|---|---|---|
| catalog-service | sbu_catalog | Prodotti, Categorie, CatalogVersion (staging/online) |
| order-service | sbu_orders | Ordini, state machine (xstate), splitting |
| cart-service | sbu_cart | Carrello, sessioni, promozioni applicate |
| pricing-service | sbu_pricing | Listini, regole prezzo, sconti |
| inventory-service | sbu_inventory | Stock multicanale, reservation |
| auth-service | sbu_auth | Utenti, ruoli, JWT, tenant registry |
| cms-service | sbu_cms | Payload CMS (pages, blocks, media) |
| hotfolder-service | sbu_hotfolder | Job queue, log import, archivio |

### API Gateway

`apps/api-gateway/` è un NestJS app che espone HTTP e fa routing verso i microservizi via NATS. Non contiene business logic.

---

## Comunicazione NATS

### Pattern

- **Request/Reply** (`@MessagePattern`): query sincrone tra servizi. Es: cart-service chiede prezzo a pricing-service.
- **Pub/Sub** (`@EventPattern`): eventi asincroni. Es: `order.created` → inventory.reserve + notification.send.
- **Queue Groups**: load balancing tra istanze dello stesso servizio.

### Registrazione client NATS

```typescript
// In qualsiasi module che deve comunicare con un altro servizio
ClientsModule.register([{
  name: 'PRICING_SERVICE',
  transport: Transport.NATS,
  options: {
    servers: ['nats://nats:4222'],
    queue: 'pricing_queue',
  },
}])
```

### Adapter NATS outbound (implementa porta)

```typescript
@Injectable()
export class NatsPricingAdapter implements PricingPort {
  constructor(@Inject('PRICING_SERVICE') private client: ClientProxy) {}

  async getPrice(productId: string, catalogVersion: string): Promise<PriceResult> {
    return firstValueFrom(
      this.client.send('pricing.get', { productId, catalogVersion }),
    );
  }
}
```

### Handler NATS inbound

```typescript
@Controller()
export class PricingNatsHandler {
  constructor(private readonly pricingService: PricingServicePort) {}

  @MessagePattern('pricing.get')
  async getPrice(data: { productId: string; catalogVersion: string }) {
    return this.pricingService.calculatePrice(data.productId, data.catalogVersion);
  }
}
```

---

## Type System — items.json

Equivalente di `items.xml` di SAP Hybris. Ogni extension/microservizio dichiara i propri tipi in un file `items.json`. La CLI `sbu generate` legge tutti gli items.json e genera automaticamente codice.

### Formato items.json

```json
{
  "$schema": "https://sbu.io/items-schema/v1",
  "extension": "productcore",
  "enumtypes": [
    {
      "code": "ProductStatus",
      "values": ["ACTIVE", "INACTIVE", "DISCONTINUED"]
    }
  ],
  "itemtypes": [
    {
      "code": "Product",
      "extends": "GenericItem",
      "table": "products",
      "attributes": [
        { "name": "code",   "type": "string",          "unique": true, "required": true },
        { "name": "name",   "type": "LocalizedString",  "required": true },
        { "name": "status", "type": "ProductStatus",     "default": "ACTIVE" },
        { "name": "price",  "type": "decimal" },
        { "name": "catalog","type": "CatalogVersion",    "relation": "many-to-one" }
      ]
    }
  ],
  "relations": [
    {
      "code": "Product2Category",
      "source": { "type": "Product",  "cardinality": "many" },
      "target": { "type": "Category", "cardinality": "many" }
    }
  ]
}
```

### Pipeline di Codegen

```
items.json → [sbu-codegen CLI]
  → packages/types/src/generated/*.ts            (TypeScript interfaces)
  → services/*/src/infrastructure/typeorm/        (TypeORM entities con decorators)
  → services/*/src/domain/models/                 (Domain models plain TS)
  → services/*/src/adapters/inbound/rest/dto/     (class-validator DTOs)
  → services/*/src/infrastructure/migrations/     (TypeORM migrations)
```

Il codegen è incrementale: rigenera solo i file impattati e crea migration TypeORM.

### Mapping tipi

| Tipo JSON | TypeORM Column | Note |
|---|---|---|
| `string` | `@Column('varchar')` | |
| `text` | `@Column('text')` | |
| `integer` | `@Column('int')` | |
| `decimal` | `@Column('decimal', { precision: 10, scale: 2 })` | |
| `boolean` | `@Column('boolean')` | |
| `datetime` | `@Column('timestamp')` | |
| `LocalizedString` | `@Column('jsonb')` | Map `{ en: "...", it: "..." }` |
| `Media` | `@ManyToOne(() => MediaEntity)` | URL + metadata |
| `enum` | TypeORM enum column | Da `enumtypes` |
| `collection` | `@Column('simple-array')` o relation | |
| `map` | `@Column('jsonb')` | Key-value |
| Custom itemtype | `@ManyToOne` / `@OneToMany` / `@ManyToMany` | Auto-risolve da relations |

---

## Extension / Plugin System

### Struttura extension

```
extensions/
  my-custom-extension/
    items.json                ← Type definitions
    src/
      domain/
        models/               ← Domain models
        ports/                ← Porte inbound/outbound
        services/             ← Use case implementations
      adapters/
        inbound/              ← Controller REST / NATS handlers
        outbound/             ← Repository TypeORM / NATS client
      infrastructure/
        typeorm/              ← TypeORM entities (generati da codegen)
      hooks/
        product.hook.ts       ← Override comportamento Product
    frontend/
      components/             ← Slot components per Next.js
    extension.json            ← Metadati (nome, versione, dipendenze)
    index.ts                  ← Export del module + metadata
```

### Hook system

```typescript
@Module({})
export class MyCustomExtension implements SbuExtension {
  static register(): DynamicModule {
    return {
      module: MyCustomExtension,
      providers: [MyCustomService],
      exports: [MyCustomService],
    };
  }

  @OnEvent('product.before-save')
  async enrichProduct(product: ProductModel) {
    // logica custom — intercetta prima del save
  }
}
```

---

## Multi-Tenant — Schema Separato per Tenant

Ogni tenant ha il proprio schema PostgreSQL (es. `tenant_acme`, `tenant_globex`) in OGNI database di microservizio.

### Identificazione tenant

```
HTTP Request → API Gateway
  ├── Subdomain: acme.sbu.io → tenant = "acme"
  ├── Header: X-Tenant-ID: acme
  └── JWT claim: { tenantId: "acme" }
```

### TypeORM DataSource per tenant

Ogni microservizio gestisce un pool di DataSource per tenant. Alla prima richiesta viene creato un DataSource dedicato puntando allo schema corretto, poi cachato in-memory.

```typescript
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const tenantId = this.extractTenantId(context);
    // SET search_path TO tenant_<tenantId>
    return next.handle();
  }
}
```

### Provisioning nuovo tenant

1. Creazione schema PostgreSQL in ogni database di microservizio (via NATS broadcast `tenant.provision`)
2. Esecuzione TypeORM migrations sugli schema appena creati
3. Esecuzione ImpEx di inizializzazione (dati essenziali)
4. Registrazione tenant nel registry globale (auth-service) con extension attive

---

## Struttura Monorepo

```
sbu-ecommerce/
├── apps/
│   ├── api-gateway/              ← NestJS API Gateway (HTTP → NATS routing)
│   ├── storefront/               ← Next.js 15 storefront (B2C/B2B)
│   ├── backoffice/               ← Next.js backoffice (admin)
│   └── cms/                      ← Payload CMS 3.x (embedded in Next.js)
├── services/
│   ├── catalog-service/          ← Prodotti, categorie, catalog versioning
│   ├── order-service/            ← Ordini, state machine, splitting
│   ├── cart-service/             ← Carrello, sessioni
│   ├── pricing-service/          ← Listini, promozioni, sconti
│   ├── inventory-service/        ← Stock, reservation, real-time
│   ├── auth-service/             ← Auth, RBAC, tenant registry
│   ├── cms-service/              ← Payload CMS backend
│   └── hotfolder-service/        ← File watcher + BullMQ pipeline
├── extensions/                   ← Plugin installabili
│   ├── core/                     ← Tipi base: GenericItem, Media, Language, Currency
│   ├── commerce/                 ← Cart, Checkout, Pricing extensions
│   ├── b2b/                      ← B2B (opzionale per tenant)
│   └── hotfolder/                ← Hot Folder processors
├── packages/
│   ├── types/                    ← TypeScript generati da codegen
│   ├── ui/                       ← shadcn/ui components condivisi
│   ├── config/                   ← tsconfig, eslint, prettier
│   └── sbu-cli/                  ← CLI (generate, migrate, extension:create)
└── tools/
    └── codegen/                  ← items.json → TypeORM + TypeScript generator
```

**Monorepo tool:** Turborepo + pnpm

---

## Stack Tecnologico Completo

| Layer | Tecnologia |
|---|---|
| Monorepo | Turborepo + pnpm |
| Backend | NestJS 11 + TypeScript (microservizi) |
| ORM / DB | TypeORM + PostgreSQL (database-per-service) |
| Transport | NATS (request/reply + pub/sub) |
| Multi-tenancy | Schema-per-tenant per servizio |
| Auth | @nestjs/passport + JWT + refresh token |
| Cache | @nestjs/cache-manager + Redis |
| CronJob | @nestjs/schedule |
| Hot Folder | chokidar + BullMQ + Redis |
| Job Queue | BullMQ + Redis |
| Frontend | Next.js 15 App Router |
| Visual CMS | Payload CMS 3.x |
| Search | Meilisearch |
| File Storage | MinIO (S3-compatible) |
| Monitoring | OpenTelemetry + Prometheus + Grafana |
| State Machine | xstate (order-service) |
| Type System | JSON Schema custom (items.json) |
| Codegen | sbu-cli |
| Licenza | BSL 1.1 |

---

## Hot Folder Pipeline

Microservizio dedicato (`hotfolder-service`) con chokidar + BullMQ:

```
CSV drop → chokidar event → BullMQ job enqueued
  → HeaderSetupProcessor (crea BatchContext)
  → ValidatorProcessor (valida schema JSON del tipo)
  → TransformerProcessor (CSV → oggetti tipizzati)
  → ImportProcessor (emette NATS events verso il servizio target)
  → ArchiveProcessor (sposta in /archive o /error)
```

Ogni step è un `@Processor()` NestJS, sovrascrivibile da plugin. L'import nei database degli altri microservizi avviene via NATS events (es. `hotfolder.product.import` → catalog-service).

---

## CMS — Payload CMS 3.x

Equivalente di SmartEdit. TypeScript-native, integrato in Next.js come App Router.

- **CMS Pages** → Payload Collections: `pages`
- **CMS Slots** → Payload Blocks (layout builder)
- **CMS Components** → Payload custom blocks con schema JSON
- **SmartEdit** → Payload Visual Editor (bidirectional live preview)
- **Page Restrictions** → Payload Access Control + custom middleware
- **Content Versioning** → Payload Drafts + publish versioning built-in
- **Staging/Online** → draft mode = staging; publish = online

---

## Convenzioni di Naming

- **Microservizi:** `<domain>-service` (es. `catalog-service`, `order-service`)
- **Database:** `sbu_<domain>` (es. `sbu_catalog`, `sbu_orders`)
- **Schema tenant:** `tenant_<tenantId>` (es. `tenant_acme`)
- **NATS subjects:** `<domain>.<action>` (es. `catalog.product.get`, `order.created`)
- **Extension:** nome in kebab-case, file `extension.json` obbligatorio
- **items.json types:** PascalCase per itemtype code, camelCase per attribute name
- **Porte:** `<Entity><Action>Port` (es. `ProductRepositoryPort`, `PricingPort`)
- **Adapter:** `<Entity><Technology>Adapter` (es. `ProductTypeOrmAdapter`, `NatsPricingAdapter`)
- **DTOs:** `<Action><Entity>Dto` (es. `CreateProductDto`, `UpdateProductDto`)
- **Mapper:** `<Entity>Mapper` con metodi statici `toDomain()` e `toEntity()`

---

## Regole per Claude Code

1. **Quando crei un nuovo microservizio**, segui SEMPRE la struttura esagonale: domain/ports/services + adapters/inbound+outbound + infrastructure/typeorm.
2. **Mai importare TypeORM nel dominio.** I domain models sono plain classes.
3. **Mai accedere al database di un altro servizio.** Usa NATS.
4. **Ogni servizio ha il proprio items.json** per i tipi che gestisce.
5. **I DTO vivono in adapters/inbound/rest/dto/**, non nel dominio.
6. **Le TypeORM entities vivono in infrastructure/typeorm/**, separate dai domain models.
7. **Usa Mapper per convertire** tra domain model e TypeORM entity.
8. **Multi-tenant:** ogni query deve rispettare lo schema del tenant corrente.
9. **Test:** unit test per domain services (mock delle porte), integration test per adapters.
10. **NATS subjects** seguono la convenzione `<domain>.<entity>.<action>`.
