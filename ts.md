# Best Practice TypeScript & NestJS Microservizi — Guida Dettagliata

Questa guida raccoglie le best practice più rilevanti e aggiornate per scrivere codice TypeScript pulito e costruire architetture NestJS a microservizi solide, scalabili e pronte per la produzione.

***

## Parte 1 — Best Practice TypeScript

### Strict Mode: Non Negoziabile

Abilitare `"strict": true` nel `tsconfig.json` è il singolo cambiamento più impattante in qualsiasi progetto TypeScript. Questo flag attiva una suite di controlli che catturano bug prima del runtime:[^1][^2][^3]

- **`strictNullChecks`** — `null` e `undefined` non sono assegnabili a ogni tipo, vanno gestiti esplicitamente[^4]
- **`noImplicitAny`** — i parametri senza annotazione di tipo generano errore invece di diventare silenziosamente `any`[^3]
- **`strictFunctionTypes`** — controllo corretto dei tipi dei parametri delle funzioni[^4]
- **`noUncheckedIndexedAccess`** — l'accesso a indice su array/oggetti restituisce `T | undefined`[^1]
- **`noImplicitOverride`** — richiede la keyword `override` esplicita[^1]
- **`useUnknownInCatchVariables`** — le variabili nei `catch` sono `unknown` invece di `any`[^3]

Per progetti esistenti, abilitare i flag uno alla volta e fixare gli errori in PR dedicate.[^2]

### Eliminare `any` e Usare `unknown`

Ogni `any` è un buco nel type system dove i bug si nascondono. Le alternative sono:[^2][^1]

- **`unknown`** per dati veramente sconosciuti — forza il narrowing esplicito prima dell'uso
- **Generics** per codice riusabile che deve preservare il tipo
- **Type guards** custom (`value is Type`) per narrowing riusabile su tipi complessi
- **Zod / io-ts / valibot** per validazione runtime di dati esterni (API response, user input) — definisci uno schema una volta e derivi sia il tipo TypeScript sia la validazione[^5][^2]

### Discriminated Unions per Gestire lo Stato

Pattern fondamentale per rendere gli stati impossibili non rappresentabili:[^1][^2][^4]

```typescript
type ApiResponse<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };
```

TypeScript narrows automaticamente il tipo in ogni branch di un `switch`, dando accesso ai campi corretti senza assertion. Questo pattern elimina intere classi di bug legati alla gestione di stato.[^1]

### Branded Types (Opaque Types)

I branded types creano tipi distinti da primitive esistenti, prevenendo il mix accidentale di valori semanticamente diversi:[^6][^7][^8]

```typescript
type UserId = string & { readonly __brand: unique symbol };
type OrderId = string & { readonly __brand: unique symbol };

function createUserId(id: string): UserId {
  return id as UserId;
}
```

Un `OrderId` non sarà mai accettato dove è richiesto un `UserId`, anche se entrambi sono `string` sotto il cofano.[^6]

### Utility Types Nativi

Usare i tipi utility built-in invece di duplicare definizioni:[^2][^4]

| Utility Type | Uso |
|---|---|
| `Partial<T>` | Rende tutte le proprietà opzionali |
| `Required<T>` | Rende tutte le proprietà obbligatorie |
| `Pick<T, K>` | Seleziona proprietà specifiche |
| `Omit<T, K>` | Esclude proprietà specifiche |
| `Record<K, V>` | Crea tipo oggetto con chiavi e valori specificati |
| `ReturnType<T>` | Estrae il tipo di ritorno di una funzione |

### Generics: Usarli con Giudizio

I generics rendono funzioni e tipi riusabili mantenendo il type safety. Regole chiave:[^9][^2]

- Constrainare i generics con `extends` per limitare i tipi accettati e migliorare autocompletion
- Preferire pochi type parameters — se una funzione generica ha più di 2 type parameters, rivalutare l'astrazione
- Usarli quando la relazione di tipo è significativa (es. funzione che mappa un array preservando il tipo dell'elemento)
- Evitarli quando un tipo concreto o una union basterebbero

### Interface vs Type

Usare **interface** per le shape degli oggetti (estendibili, messaggi d'errore chiari, augmentable) e **type alias** per union, intersection, mapped types e conditional types.[^2]

### Type Inference: Lasciare Lavorare TypeScript

Evitare annotazioni di tipo ridondanti dove TypeScript può inferire correttamente:[^10][^9]

```typescript
// ❌ Ridondante
const name: string = 'Mario';

// ✅ TypeScript inferisce string
const name = 'Mario';
```

### Organizzazione del Codice

Organizzare i tipi accanto al codice che li usa:[^2]

- Tipi specifici del componente/servizio nel file del componente
- Tipi condivisi in una directory `types/` dedicata
- Tipi delle API response vicino al codice del client API
- Evitare un singolo file `types.ts` monolitico

***

## Parte 2 — Best Practice NestJS Microservizi

### Design con Domain Boundaries Chiare

Ogni microservizio deve avere una singola responsabilità e incapsulare una capability di business specifica (Domain-Driven Design):[^11][^12]

- **User Service** — autenticazione, registrazione, gestione profili
- **Product Service** — catalogo, inventario, prezzi
- **Order Service** — ordini e transazioni
- **Notification Service** — notifiche cross-servizio

Allineare i microservizi con i domini di business garantisce scalabilità e manutenibilità indipendente.[^13]

### Protocollo di Comunicazione Consistente

Scegliere un protocollo consistente per la comunicazione inter-servizio:[^14][^11]

| Protocollo | Tipo | Caso d'uso |
|---|---|---|
| TCP | Request-Response | Comunicazione sincrona semplice tra servizi |
| gRPC | Request-Response | Alta performance, contratti tipizzati, streaming |
| Redis Pub/Sub | Event-Driven | Notifiche, eventi leggeri |
| RabbitMQ | Event-Driven | Garanzia di consegna, code persistenti |
| Kafka | Event-Driven | Alta throughput, event sourcing, audit trail |

NestJS astrae il transport layer, permettendo di switchare tra TCP, Redis, RabbitMQ, Kafka e gRPC senza cambiare la business logic.[^14]

### API Gateway come Punto d'Ingresso Unico

Invece di far chiamare ai client più servizi direttamente, usare un API Gateway:[^11][^13][^14]

- Routing delle richieste ai microservizi corretti
- Gestione centralizzata di autenticazione, rate limiting e logging
- Load balancing e timeout con `firstValueFrom()` + pipe `timeout(5000)` + `catchError()`[^14]

```typescript
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.USER_SERVICE_HOST || 'user-service',
          port: parseInt(process.env.USER_SERVICE_PORT, 10) || 3001,
        },
      },
    ]),
  ],
})
export class AppModule {}
```

In produzione Docker, il `host` deve essere il **service name** del container, non `localhost`.[^14]

### Database Per Service

Ogni microservizio deve possedere il proprio database privato, accessibile solo tramite le sue API:[^15][^16]

- **Schema-per-service** — ogni servizio ha uno schema DB dedicato (overhead minimo)
- **Database-server-per-service** — per servizi ad alta throughput
- Cambio dello schema interno senza impatto su altri servizi
- Libertà di scegliere il DB ottimale per ogni servizio (PostgreSQL, MongoDB, Redis)
- Query cross-service implementate con **API Composition** o **CQRS**[^15]

### Structured Logging Centralizzato

Implementare logging strutturato in formato JSON con campi consistenti su tutti i servizi:[^17][^18]

- **Campi obbligatori**: `timestamp`, `level`, `message`, `service`, `environment`
- **Trace correlation**: `trace_id`, `span_id`, `request_id` per tracciare richieste distribuite
- **Error info**: tipo, messaggio, stack trace
- Usare librerie come **Pino** (nest-pino) o **Winston** per logging ad alte prestazioni[^18]
- Il campo `service_name` deve essere dinamico per identificare da quale microservizio arriva il log[^17]
- Usare `AsyncLocalStorage` per propagare il contesto della richiesta automaticamente attraverso le catene async[^17]
- **Mai loggare** password, token, o PII (dati personali)[^17]

### Validazione della Configurazione all'Avvio

Validare tutte le variabili d'ambiente al bootstrap del servizio per fallire velocemente se manca qualcosa:[^19][^20]

- **Joi** con `ConfigModule.forRoot({ validationSchema })` — approccio nativo NestJS[^20]
- **Zod** con `nestjs-zod` — singola source of truth per schema, DTO e tipi TypeScript[^21][^5]
- `ConfigModule.forFeature()` per configurazione modulare per feature, evitando un servizio di config globale monolitico[^19]

### Validazione DTO con Zod o Class-Validator

Per la validazione dei dati in ingresso, due approcci principali:[^22][^5][^21]

| Aspetto | class-validator | Zod (nestjs-zod) |
|---|---|---|
| Paradigma | OOP / class-based | Funzionale / composable |
| Inferenza tipi | Manuale | `z.infer<typeof Schema>` automatica |
| Integrazione NestJS | Nativa via `ValidationPipe` | Richiede `ZodValidationPipe` |
| Performance | Leggermente più pesante | Veloce e leggero |
| Source of truth unica | No (DTO + tipo separati) | Sì (schema → DTO + tipo) |

### Error Handling Robusto

Implementare gestione errori consistente su tutti i microservizi:[^11][^14]

- **RpcExceptionFilter** globale per catturare e formattare gli errori nel contesto microservizio
- Formato errore standardizzato: `{ error: true, message, code, timestamp }`
- Gestione esplicita dei timeout nell'API Gateway con `pipe(timeout(5000))`
- Fallback response quando un servizio è irraggiungibile

### Circuit Breaker Pattern

Prevenire il cascading failure quando un servizio va giù:[^23][^24][^25]

- **Closed** — richieste passano normalmente, i fallimenti vengono contati
- **Open** — le richieste vengono bloccate e restituita una fallback response
- **Half-Open** — dopo un timeout, viene permessa una richiesta di prova
- Configurare soglie di fallimento (es. 50% failure rate) e timeout (es. 30 secondi)
- Combinare con **Retry con exponential backoff** per errori transitori (max 3 tentativi)[^26][^23]

### Saga Pattern per Transazioni Distribuite

Le transazioni ACID tradizionali non funzionano attraverso servizi. Usare il Saga Pattern:[^27][^14]

1. Ogni step è una transazione locale nel rispettivo servizio
2. Se uno step fallisce, vengono eseguite **compensating transactions** in ordine inverso
3. Approccio **Orchestration** — un saga orchestrator coordina i passi
4. Approccio **Choreography** — i servizi comunicano tramite eventi
5. Logging obbligatorio di ogni step per intervento manuale in caso di fallimento della compensazione[^14]

### CQRS (Command Query Responsibility Segregation)

Separare le operazioni di lettura da quelle di scrittura:[^28][^29][^30]

- **Commands** — azioni che cambiano stato (create, update, delete)
- **Queries** — azioni che leggono dati
- Il modulo `@nestjs/cqrs` fornisce `CommandHandler`, `QueryHandler`, `EventHandler`, `Saga`
- Utile quando read e write hanno esigenze di scaling diverse
- Particolarmente efficace in architetture microservizi con event sourcing[^29]

### Health Check con Terminus

Implementare health check per monitoraggio e service discovery:[^31][^11][^14]

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.1 }),
    ]);
  }
}
```

Nel `docker-compose.yml`, aggiungere HEALTHCHECK con `start_period` adeguato per evitare false unhealthy all'avvio.[^32][^14]

### Monorepo con Shared Libraries

Usare un approccio monorepo per condividere codice tra microservizi:[^33][^34][^35]

- **NestJS CLI nativo** — supporto monorepo built-in con `apps/` e `libs/`[^34]
- **Nx** — dependency graph intelligente, affected commands, incremental builds[^35]
- **Turborepo** — caching intelligente, configurazioni TypeScript consistenti[^33]

Struttura tipica:

```
monorepo/
├── apps/
│   ├── api-gateway/
│   ├── auth-service/
│   └── order-service/
├── libs/
│   ├── shared-dtos/      # DTO e interfacce condivise
│   ├── common/           # Filtri, guard, interceptor
│   └── database/         # Logica DB condivisa
```

Le shared libraries eliminano duplicazione di codice, disallineamenti di versione e permettono refactoring atomici.[^35]

### Docker Multi-Stage Build Ottimizzato

Usare build multi-stage con Alpine per immagini di produzione minimali (~150-200MB):[^36][^37][^14]

- **Stage 1 (builder)**: installa tutte le dipendenze, compila TypeScript
- **Stage 2 (production)**: copia solo `dist/`, `node_modules/` (production only), `package.json`
- Base image `node:20-alpine` (~50MB vs ~350MB con `node:20`)[^36]
- `npm prune --production` dopo il build per rimuovere devDependencies[^36]
- User non-root per sicurezza (`adduser -S nestjs`)[^14]
- HEALTHCHECK nel Dockerfile con `start_period` e `retries`[^14]

### Testing a Più Livelli

Strategia di testing per microservizi:[^38][^39][^14]

- **Unit test** — testare handler e servizi in isolamento con mock (`jest.fn()`)
- **Integration test** — verificare che moduli diversi funzionino insieme, con database reale o **TestContainers**[^39]
- **E2E test** — creare il microservizio reale con `Test.createTestingModule`, connettersi via `ClientProxy`, e verificare il flusso completo[^14]
- In quantità: unit test > integration test > e2e test[^38]

### Sicurezza dei Microservizi

Proteggere i microservizi con:[^11]

- **JWT** per autenticazione e autorizzazione tramite Passport
- **TLS/SSL** per comunicazione criptata tra servizi
- Secrets gestiti tramite variabili d'ambiente, mai hardcoded
- Autenticazione centralizzata nell'API Gateway, propagata ai servizi interni
- User non-root nei container Docker[^36]

### Idempotenza degli Handler

Progettare i message handler per essere idempotenti — safe da ritentare senza effetti collaterali. Questo è critico quando si usano retry e message broker che possono riconsegnare messaggi.[^14]

***

## Checklist Riassuntiva

### TypeScript

- `"strict": true` nel tsconfig.json — sempre
- Zero `any` — usare `unknown`, generics, o tipi propri
- Discriminated unions per stato complesso
- Branded types per ID e valori semantici
- Utility types nativi al posto di duplicazioni
- Validazione runtime con Zod/io-ts per dati esterni
- Tipi organizzati accanto al codice che li usa

### NestJS Microservizi

- Un microservizio = un dominio di business
- Database dedicato per servizio
- API Gateway come unico punto d'ingresso
- Logging strutturato JSON con trace correlation
- Validazione config all'avvio (fail fast)
- DTO validati con Zod o class-validator
- Circuit breaker + retry con exponential backoff
- Saga pattern per transazioni distribuite
- Health check su ogni servizio
- Monorepo con shared libs
- Docker multi-stage build ottimizzato
- Test unit + integration + e2e
- Handler idempotenti

---

## References

1. [TypeScript Best Practices for 2025 - Jason Cochran](https://jasoncochran.io/blog/typescript-best-practices) - TypeScript patterns proven across 320,000+ lines of production code in Catalyst PSA and WellOS. What...

2. [TypeScript Best Practices: Writing Clean, Maintainable, Type-Safe ...](https://zeonedge.com/mt/blog/typescript-best-practices-2026) - TypeScript adoption continues to grow. Here are the best practices that separate clean, maintainable...

3. [TypeScript Best Practices: A Developer's Guide for 2026](https://nextool.app/blog/typescript-best-practices.html) - The complete guide to writing production-grade TypeScript. Strict mode, generics, utility types, bra...

4. [TypeScript Best Practices: Writing Maintainable Enterprise Code](https://www.codematic.be/de/blog/21) - Learn advanced TypeScript patterns and practices for building large-scale applications. Discover typ...

5. [Zod + NestJS | Validation, Types & Swagger](https://www.youtube.com/watch?v=r3vaGIkkEUc) - Learn how to integrate Zod with NestJS to handle validation, TypeScript types, and Swagger documenta...

6. [Opaque Types In TypeScript](https://www.geeksforgeeks.org/typescript/opaque-types-in-typescript/) - Your All-in-One Learning Portal: GeeksforGeeks is a comprehensive educational platform that empowers...

7. [Opaque / Branded Types in Typescript](https://ferreira.io/posts/opaque-branded-types-in-typescript) - It has several native types defined that you can annotate variables with. These range from number, t...

8. [How to Implement Branded Types in TypeScript - OneUptime](https://oneuptime.com/blog/post/2026-01-30-how-to-implement-branded-types-in-typescript/view) - Learn how to use branded types in TypeScript to create distinct types that prevent accidental type m...

9. [Best Practices for Writing Clean TypeScript Code 🚀](https://dev.to/alisamir/best-practices-for-writing-clean-typescript-code-57hf) - TypeScript has become a popular choice for JavaScript developers who want a more structured approach...

10. [TypeScript Best Practices in 2025 - DEV Community](https://dev.to/mitu_mariam/typescript-best-practices-in-2025-57hb) - TypeScript Best Practices in 2025 ; 1. Type Safety First: Never Compromise on Types ; 2. Embrace the...

11. [Best Practices for Building Microservices with NestJS - Dev.to](https://dev.to/ezilemdodana/best-practices-for-building-microservices-with-nestjs-p3e) - 1. Design Microservices with a Clear Domain · 2. Use a Consistent Communication Protocol · 3. Implem...

12. [NestJS Microservices: A Practical Guide to Building Scalable Apps](https://talent500.com/blog/nestjs-microservices-guide/) - This article explores the concept of microservice architecture, its advantages, and provides a step-...

13. [Build a Microservice Architecture with NestJS - Telerik.com](https://www.telerik.com/blogs/build-microservice-architecture-nestjs) - In this article, we'll discuss the microservice architecture, its advantages and finally build a sim...

14. [How to Implement Microservices with NestJS - OneUptime](https://oneuptime.com/blog/post/2026-02-02-nestjs-microservices/view) - Health Checks and Service Discovery. Implement health checks so your services can be monitored and d...

15. [Pattern: Database per service - Microservices.io](https://microservices.io/patterns/data/database-per-service.html) - Keep each microservice's persistent data private to that service and accessible only via its API. A ...

16. [Managing Your Data: A Practical Guide to TypeORM in a NestJS ...](https://www.mishrilalsahu.in.net/Blogs/managing-your-data-a-practical-guide-to-typeorm-in-a-nestjs-microservice-architecture) - Master data management in NestJS microservices. This guide covers the "database per service" pattern...

17. [How to Implement Structured Logging Best Practices - OneUptime](https://oneuptime.com/blog/post/2026-01-25-structured-logging-best-practices/view) - A comprehensive guide to implementing structured logging best practices in your applications.

18. [Nestjs Microservices Logging Using Nest-pino and Winston  #03](https://www.youtube.com/watch?v=aEoaKOnSIx8) - Mastering NestJS Logging || ELK Stack Logging Nestjs Microservices #02
Part-1 
The Ultimate Guide to...

19. [How to validate configuration per module in NestJs](https://www.darraghoriordan.com/2021/10/10/validate-configuration-module-feature-nestjs) - How to validate configuration per module in NestJs

20. [How to perform NestJS Config Validation? - PROGRESSIVE CODER](https://progressivecoder.com/how-to-perform-nestjs-config-validation/) - Want to learn how to perform NestJS Config Validation? Check out this post where we use Joi Schema V...

21. [All NestJS + Zod utilities you need](https://github.com/BenLorantfy/nestjs-zod) - Creates a nestjs DTO from a zod schema. These zod DTOs can be used in place of class-validator / cla...

22. [Mastering Validation in TypeScript with class-validator](https://dev.to/seenu-subhash/mastering-validation-in-typescript-with-class-validator-a-complete-beginners-guide-51lj) - Learn how to validate user input in TypeScript and NestJS using class-validator . This in-depth tuto...

23. [Mastering Microservices in NestJS: Powerful Design Patterns for ...](https://blog.stackademic.com/mastering-microservices-in-nestjs-powerful-design-patterns-for-flexibility-resilience-and-64309ae219e8) - The SAGA Pattern manages complex transactions across multiple services by breaking them into smaller...

24. [Prevent Microservice Failures with NestJS Circuit Breaker Pattern](https://www.youtube.com/watch?v=8uMN5EN6BM8) - your NestJS applications. This video provides a practical, step-by-step guide to building more resil...

25. [Resilience in Modern Applications: The Circuit Breaker Pattern](https://www.mansour.co.nz/blog/building-resilience-circuit-breaker-pattern) - Senior Full-Stack Engineer in NZ

26. [Build Resilient Microservices: Circuit Breakers, Retries](https://dzone.com/articles/how-to-build-resilient-microservices-using-circuit) - Discover how you can build systems that fail smart, not hard. To prevent microservices from crashing...

27. [Implementing Saga Pattern in Microservices with Node.js](https://blog.bitsrc.io/implementing-saga-pattern-in-a-microservices-with-node-js-aa2faddafac3) - The Saga pattern is a design pattern used to manage transactions and ensure data consistency across ...

28. [Building Modular, Event-Driven Microservices with CQRS in NestJS | Muhammad Waqar](https://waqarilyas.dev/blog/07-modular-event-driven-microservice-with-cqrs/) - Learn how to build scalable and maintainable microservices in NestJS with a modular architecture, CQ...

29. [CQRS Pattern in Nest.js - DEV Community](https://dev.to/jacobandrewsky/cqrs-pattern-in-nestjs-4n3p) - CQRS can dramatically improve the structure, maintainability, and scalability of your NestJS applica...

30. [NestJS Event Driven Systems - OneUptime](https://oneuptime.com/blog/post/2026-02-02-nestjs-event-driven-systems/view) - For more sophisticated scenarios, NestJS's CQRS module separates read and write operations through C...

31. [Health checks (Terminus) | NestJS - A progressive Node.js framework](https://docs.nestjs.com/recipes/terminus) - Terminus integration provides you with readiness/liveness health checks. Healthchecks are crucial wh...

32. [Health check in docker-compose with nestjs app - Stack Overflow](https://stackoverflow.com/questions/78640493/health-check-in-docker-compose-with-nestjs-app) - I am running the nest app in port 8005, adding the health check route in the docker-compose. I attac...

33. [A NestJS Monorepo Starter Kit with Turborepo](https://nestjscourses.com/article/a2b8ad03-1c6c-4c43-bd7a-e9f590fba7ad) - This NestJS Turborepo Starter Kit simplifies the setup for teams building multiple NestJS microservi...

34. [Setup MonoRepo in Nest.js](https://dev.to/asibul_hasan_5fe57cd945b8/setup-monorepo-in-nestjs-dj4) - Monorepos are becoming the default choice for backend teams that manage more than one service or...

35. [Monorepo Architecture with NestJS and Nx (CI/CD, Docker, K8s)](https://www.djamware.com/post/monorepo-architecture-with-nestjs-and-nx-cicd-docker-k8s) - Build a production-ready monorepo with NestJS and Nx. Learn shared libs, CI/CD with affected builds,...

36. [How to Optimize Docker Image Size for a NestJS App Using Multi ...](https://oneuptime.com/blog/post/2026-02-17-how-to-optimize-docker-image-size-for-a-nestjs-application-using-multi-stage-builds-and-alpine-base-images-for-gke/view) - Learn how to dramatically reduce Docker image size for NestJS applications using multi-stage builds ...

37. [The Last Dockerfile You Need for NestJS](https://dawchihliou.github.io/articles/the-last-dockerfile-you-need-for-nestjs) - The ultimate NestJS Dockfile for optimized production image and local development.

38. [NestJS-microservice with TypeORM, MariaDb and Integration & E2E ...](https://itnext.io/nestjs-microservice-with-typeorm-mariadb-and-integration-e2e-testing-379338e99580) - Create a NestJS microservice on TCP with TypeORM, MariaDB, and learn how to write Unit, Integration,...

39. [Improving Integration/E2E testing using NestJS and TestContainers](https://dev.to/medaymentn/improving-intergratione2e-testing-using-nestjs-and-testcontainers-3eh0) - Today we are going to walk you through this tutorial on how you can improve these kind of test cases...

