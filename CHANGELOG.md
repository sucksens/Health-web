# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-05-14

### Added

- Suite de tests para backend con pytest + httpx (cobertura en auth, users, body_metrics, weight_goals, medical_history)
- Suite de tests para frontend con Vitest + Testing Library
- Documentación del esquema de pruebas del backend
- Documentación del sistema de testing del frontend

---

## [0.1.0] - 2026-05-11

### Added

- Sistema de gestión de salud personal con FastAPI + Astro/React
- Autenticación JWT con refresh tokens y rotación
- RBAC con 3 roles: admin, manager, user
- Módulo de métricas corporales (peso, IMC, cintura, pecho, brazo)
- Módulo de metas de peso con seguimiento de progreso
- Historial médico: perfil de salud, doctores, especialidades, citas, recetas, medicamentos, documentos, adherencia
- 6 tipos de reportes PDF con gráficos
- Administración de usuarios, roles y permisos
- Registro de auditoría (activity logs)
- Gráficos de evolución con ECharts
- UI con shadcn/ui + Tailwind CSS 4

### Changed

- Versionado unificado mediante archivo `VERSION` en la raíz del proyecto
- Backend lee su versión dinámicamente desde `VERSION`
