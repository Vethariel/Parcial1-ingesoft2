# Frontend

React + Vite + TypeScript, con Tailwind y React Router. Estructura y decisiones: `docs/ARQUITECTURA.md`.

```bash
npm install
npm run dev     # http://localhost:5173 (requiere el backend en :3000)
npm run build   # verifica tipos y genera dist/
npm run lint
```

En desarrollo, las llamadas a `/api/...` se reenvían al backend (`vite.config.ts`).
