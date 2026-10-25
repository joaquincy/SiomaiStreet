# React + Vite

## Local development and Supabase

Copy `.env.example` to `.env.local`, set your Supabase project URL and a server-only service role key, then run `npm run dev`. This starts both the site and its API. Do not expose the service role key through a `VITE_` variable or commit `.env.local`.

Before submitting reviews or franchise applications, apply the SQL migration in `supabase/migrations` using the Supabase SQL Editor. More setup details are in [supabase/README.md](supabase/README.md).

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
