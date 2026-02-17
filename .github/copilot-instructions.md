# AI Coding Agent Instructions - AI Golf Caddie

## Project Overview
**AI Golf Caddie** is a Next.js 16 full-stack application for tracking golf round metrics using PostgreSQL and Prisma ORM. The project follows a standard create-next-app template with Tailwind CSS styling and TypeScript strict mode.

**Tech Stack:** Next.js 16.1.6, React 19.2.3, TypeScript 5, Prisma 7.3.0, PostgreSQL, Tailwind CSS

## Architecture

### Data Layer (Prisma)
- **Schema Location:** `prisma/schema.prisma`
- **Models:** `User` (golfers) and `Round` (golf rounds with metrics)
- **Key Pattern:** Prisma 7 requires explicit `accelerateUrl` parameter when instantiating `PrismaClient` (see `test-db.ts`)
- **Configuration:** `prisma.config.ts` defines schema path and datasource URL via `DATABASE_URL` env var
- **Generated Types:** `app/generated/prisma/` contains auto-generated Prisma client types (do NOT edit manually)

### Frontend
- **App Router:** Uses Next.js 13+ app directory (`app/`) structure
- **Entry Point:** `app/page.tsx` (boilerplate landing page - modify for feature work)
- **Layout:** `app/layout.tsx` includes Geist font variables and Tailwind CSS globals
- **Styling:** Tailwind CSS 4 with PostCSS via `postcss.config.mjs`

### Build & Environment
- **Config Files:** `tsconfig.json` (strict mode), `eslint.config.mjs` (Next.js rules), `next.config.ts`
- **Env Vars:** Must set `DATABASE_URL` (Prisma Accelerate URL) and load with `process.loadEnvFile()` (Node 22 native)

## Critical Developer Workflows

### Database Operations
1. **Schema Changes:**
   - Modify `prisma/schema.prisma`
   - Run `npx prisma generate` to regenerate client types in `app/generated/prisma/`
   - Create migration: `npx prisma migrate dev --name <migration_name>`

2. **Testing Queries:**
   - Use `test-db.ts` as reference for data operations
   - Run with `npx ts-node test-db.ts` (includes `.env` loading and Prisma Accelerate setup)
   - Pattern: Always `include` related records and chain `.finally()` for cleanup

### Development Server
- `npm run dev` - Start Next.js dev server on http://localhost:3000
- `npm run build` - Build for production
- `npm start` - Run production build
- `npm run lint` - ESLint with Next.js rules

## Project-Specific Patterns

### Prisma Usage
- **Accelerate URLs:** `PrismaClient({ accelerateUrl: process.env.DATABASE_URL })`
- **Relations:** Use `include: { relatedModel: true }` to fetch related records (User ↔ Round relationships)
- **Type Safety:** Generated types auto-update in `app/generated/prisma/models/` after schema changes

### TypeScript Conventions
- **Strict Mode:** Enabled (all types must be explicit)
- **Path Aliases:** `@/*` maps to project root
- **React 19:** Use functional components, built-in hooks
- **Type Imports:** Use `import type` for type-only imports

### Known Issues & Workarounds
- **Prisma generate failures:** Ensure `DATABASE_URL` is set and accessible; migrations must be up-to-date
- **Missing env vars:** Use `process.loadEnvFile()` before Prisma operations in Node.js scripts

## When Adding Features

1. **Database:** Update `prisma/schema.prisma`, run migrations, commit generated types
2. **API Routes:** Add in `app/api/` following Next.js conventions; import Prisma client
3. **Pages/Components:** Place in `app/` directory; use TypeScript, follow strict mode
4. **Styling:** Use Tailwind utility classes (Tailwind 4 syntax); reference `app/globals.css`
5. **Linting:** Run `npm run lint` before commit; fix ESLint + Next.js rule violations

## File Structure Reference
```
prisma/                  # Database schema & migrations
app/                     # Next.js app router (pages, layouts, API routes)
app/generated/prisma/    # Auto-generated Prisma types (DO NOT EDIT)
eslint.config.mjs        # ESLint configuration
test-db.ts              # Reference for Prisma operations
```
