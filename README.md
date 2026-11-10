# CertiSen Web-app

Monorepo Turborepo + Next.js, créé le 06/11/2026 avec `create-turbo` (exemple par défaut).

- `apps/web` : site vitrine CertiSen (port 3000).
- `apps/docs` : seconde app du modèle, gardée pour l'instant.
- `apps/*` : les futurs projets rattachés viendront ici.
- `packages/*` : UI, ESLint et TypeScript partagés.

## Site vitrine (apps/web)

- Tailwind CSS v4, motion (animations), Lucide (icônes), Lenis (défilement doux).
- Langues : anglais (par défaut), français, chinois. `proxy.ts` redirige `/` vers `/en`, `/fr` ou `/zh` selon le cookie `NEXT_LOCALE` (choix fait dans le sélecteur), sinon la langue du navigateur, sinon l'anglais. Pages sous `app/[lang]/`, textes dans `lib/i18n/dictionaries/{en,fr,zh}.ts` (fr et zh doivent avoir la même forme que en, vérifié par TypeScript).
- Charte monochrome (noir, blanc, gris) avec grain léger ; jetons de couleur dans `app/globals.css`.
- 3D : React Three Fiber + drei + postprocessing. Héros : réseau TSN abstrait (`components/three/network-canvas.tsx`, `lib/network.ts`). Section « En action » : voiture fil de fer générée en code (`lib/car.ts`) avec réseau TSN cliquable (`lib/car-network.ts`, `components/three/car-canvas.tsx`) ; la caméra suit le défilement en 4 plans.
- Les latences affichées dans les fiches des composants sont des valeurs d'illustration.
- Sections dans `components/sections/` : héros, problème, fossé OTA, solution (connecteurs animés), plateforme, en action, positionnement et marché, parcours, contact.
- Logo monochrome en SVG (bouclier, chrono, coche) : `components/logo.tsx` et `app/icon.svg`.
- Formulaire de contact : ouvre la messagerie vers certisen@inria.fr (pas de serveur pour l'instant).

## Lancer en local

Le projet impose pnpm 11.25.0. Le pnpm 10 global n'arrive pas à basculer tout seul, donc on passe par npx :

```bash
npx pnpm@11.25.0 install
npx pnpm@11.25.0 dev --filter=web
```

---
# Turborepo starter

This Turborepo starter is maintained by the Turborepo core team.

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `@repo/ui`: a stub React component library shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `@next/eslint-plugin-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo build
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo build
pnpm exec turbo build
pnpm exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo build --filter=docs
```

Without global `turbo`:

```sh
npx turbo build --filter=docs
pnpm exec turbo build --filter=docs
pnpm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo dev
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo dev
pnpm exec turbo dev
pnpm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo dev --filter=web
```

Without global `turbo`:

```sh
npx turbo dev --filter=web
pnpm exec turbo dev --filter=web
pnpm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo login
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo login
pnpm exec turbo login
pnpm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo link
```

Without global `turbo`:

```sh
npx turbo link
pnpm exec turbo link
pnpm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.dev/docs/reference/configuration)
- [CLI Usage](https://turborepo.dev/docs/reference/command-line-reference)

