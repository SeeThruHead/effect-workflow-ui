# effect-workflow-ui

A read-only viewer for Effect cluster and Effect workflow runs: a Docker image (the viewer and its server) and the
libraries it is built from (the reader and the Foldkit kit). README.md says what it is for; this file is how to work
on it.

## Commands

Every command is a package.json script; moon tasks wrap them with inputs for caching. Never invoke a tool binary
directly.

- `git submodule update --init` (Spar lives in `vendor/spar`), `bun install`, then `bun run prepare` for the hooks.
- `bun run check`: format check, lint, typecheck and tests for every project.
- `bun run --cwd apps/sample start`: the sample shop on a SingleRunner cluster, writing to `SAMPLE_DB` (a SQLite path,
  default `.data/sample.db`, or a `postgres://` URL).
- `bun run --cwd apps/sample record`: records `.data/sample.db` into `src/fixtures/recording.json`, replayed 20
  minutes after its last write. Stop the sample while an order is in its 90 second sleep so the replay has an
  overdue run. Then `bun run --cwd apps/sample stories` regenerates the kit's Storybook fixture from it.
- `bun run --cwd apps/viewer dev` (Vite, port 5174, proxies `/rpc`) with `bun run --cwd apps/viewer start`
  (`CLUSTER_DATABASE_URL`, port 4317) for the live viewer; `build` and `build:recorded` for the two builds.
- `bun run --cwd apps/site build`: the website into `apps/site/dist`, with `apps/viewer/dist/recorded` copied in as
  `demo/`. Build the recorded viewer first.
- `bun run storybook`: the kit's Storybook on port 6008.
- `docker build .`: the image. The server is cross-compiled with `bun build --compile` on the build machine, so
  arm64 needs no emulation.

## Layout

- `packages/reader`: `ClusterRepo` (`./repo`) is the only module that touches SQL: two selects, ids cast to text
  (snowflakes overflow a JS number), Postgres reads inside a `READ ONLY` transaction, SQLite opened read-only.
  `Journal.executions` folds rows into the kit's `Execution` model; `Decode` decodes payloads with the app's
  Workflow Schemas; `Attention.attention` classifies runs as failed, overdue, stuck or waiting.
- `packages/ui`: Foldkit components and StyleX tokens; `src/workflow/model.ts` is the run model.
- `packages/client`: the viewer's one RPC (`ReadRecording`), in `src/Endpoint.ts` because lint allows RPC
  definitions only there.
- `apps/viewer`: the Foldkit app. Pages in `src/pages`, the Elm loop in `src/app`. The storage source is the
  `Source` service, provided at the entry: `Source.live` (Effect RPC to `src/app/server.ts`) or
  `Source.recorded` (a static `recording.json`). The browser does the fold, so both run the same code.
- `apps/sample`: the shop and the tests that read its recording through the reader (packages may not import apps,
  so the reader's tests live here).
- `apps/site`: Spar views rendered to static HTML by `tools/build.ts`, with code highlighted at build time.
- `tooling/lint`, `tooling/hooks`: the house rules and the attribution hook.

## What the linter enforces

oxlint with the Effect presets and the house rules: no loops, `let`, mutation, comments, nested ifs, multi-line
logical chains, casts or `Effect.gen` wrappers; `Effect.run*` only in `src/app/server.ts` and `tools/`; app and
package boundaries (an app is reached only through its `Api.ts`); SQL only in `*Repo.ts`; RPCs only in a client's
`src/Endpoint.ts`.

## What reviewers check instead

The viewer never writes to a cluster. Scopes around every resource, single level of abstraction per function, and
tests that fail when the behaviour they guard breaks. Nothing from any other project's code, names or data:
fixtures come only from the sample shop.
