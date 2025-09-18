# Architecture Decision Records

This Readme tracks critical engineering decisions in this directory. Each ADR captures the context, the option stack, the decision, and consequences for future reference.

| ID | Decision | Status |
| --- | --- | --- |
| ADR-0001 | [API Framework: Express + TypeScript over Fastify/NestJS](ADR-0001-api-framework-express-over-fastify-next.md) | Accepted |
| ADR-0002 | [ORM: Prisma over Drizzle/TypeORM](ADR-0002-orm-prisma-over-drizzle-typeorm.md) | Accepted |
| ADR-0003 | [Auth: NextAuth over Auth0/Clerk/Supabase Auth](ADR-0003-auth-nextauth-over-auth0-clerk.md) | Accepted |
| ADR-0004 | [Rate Limiting: Redis/Lua Token-Bucket over express-rate-limit/in-memory](ADR-0004-rate-limiting-redis-over-express.md) | Accepted |
| ADR-0005 | [Database: PostgreSQL over NoSQL/MongoDB/Vector DBs](ADR-0005-database-postgresql-over-others.md) | Accepted |
| ADR-0006 | [API Style: JSON REST over GraphQL](ADR-0006-api-style-json-rest-over-graphql.md) | Accepted (Supersedes prior ADR-0006) |
| ADR-0007 | [Object Storage: Amazon S3 over Alternatives](ADR-0007-storage-s3-over-others.md) | Accepted |
| ADR-0008 | [Deployment: Separate PaaS (Vercel + Render) over EC2](ADR-0008-deployment-separate-paas-over-ec2.md) | Accepted |
| ADR-0009 | [Language: TypeScript over JavaScript](ADR-0009-language-ts-over-js.md) | Accepted |
| ADR-0010 | [Frontend Framework: React over Vue/Angular](ADR-0010-frontend-framework-react-over-others.md) | Accepted |
| ADR-0011 | [Frontend Hosting: Vercel over Netlify/Cloudflare Pages](ADR-0011-frontend-hosting-vercel-over-others.md) | Accepted |
| ADR-0012 | [Services Hosting: Render over Railway/Fly/EC2](ADR-0012-services-hosting-render-over-others.md) | Accepted |
