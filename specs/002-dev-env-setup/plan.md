# Implementation Plan: Estandarización del Entorno de Desarrollo

**Branch**: `002-dev-env-setup` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

Documentar y automatizar el entorno de desarrollo del monorepo Biometrico: stack tecnológico,
herramientas, comandos de arranque y convenciones de código. El resultado es un `README.md` raíz
completo y un script de verificación de prerrequisitos que permite a un desarrollador nuevo tener
el entorno operativo en menos de 30 minutos.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x (LTS) / pnpm 9.x

**Primary Dependencies**: Turborepo, pnpm workspaces, Supabase CLI, ESLint, Prettier, Husky

**Storage**: Supabase local (Docker) para desarrollo; PostgreSQL 17.x

**Testing**: Vitest (unitarios)

**Target Platform**: macOS / Linux; Windows con WSL2 documentado

**Project Type**: Monorepo — documentación e infraestructura de desarrollo

**Constraints**:
- Script de verificación NO instala herramientas; solo detecta y reporta lo faltante
- README no incluye credenciales — apunta a `.env.example`
- Prerrequisitos mínimos: Node 20+, pnpm 9+, Docker Desktop

**Scale/Scope**: 1 README, 1 script bash, archivos de config (ESLint, Prettier, Husky, turbo.json)

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I–VII | No directamente | ✅ N/A — spec de infraestructura |
| VIII — Mobile-first | No | ✅ N/A |
| IX — Simplicidad UX | Sí | ✅ Onboarding < 30 min; mensajes de error accionables en check-env.sh |

**Gate**: ✅ Sin violaciones.

## Project Structure

### Documentation

```text
specs/002-dev-env-setup/
├── plan.md
├── research.md
├── quickstart.md
└── tasks.md
```

### Source Code

```text
/
├── README.md
├── package.json                # workspace root (pnpm)
├── pnpm-workspace.yaml
├── turbo.json
├── .eslintrc.json
├── .prettierrc
├── .env.example
├── .husky/pre-commit
├── scripts/check-env.sh
├── apps/
│   ├── backend/
│   │   ├── package.json        # Express + Supabase JS
│   │   ├── tsconfig.json
│   │   └── .env.example
│   └── frontend/
│       ├── package.json        # Next.js 14 + PrimeReact
│       ├── tsconfig.json
│       └── .env.example
└── packages/
    ├── types/package.json
    └── utils/package.json
```

**Structure Decision**: Monorepo pnpm con Turborepo. `apps/` para aplicaciones desplegables,
`packages/` para librerías internas.
