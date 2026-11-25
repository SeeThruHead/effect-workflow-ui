# Effect workflow UI

A read-only viewer for [Effect](https://effect.website) cluster and Effect workflow runs. Point it at the SQL
storage your cluster already writes, and it shows what needs attention, every run, and each run's steps: retries
with their errors, durable sleeps, signals and compensations.

**Status: early.** It reads two tables and never writes to your cluster. Postgres and SQLite.

- Website and live demo: https://seethruhead.github.io/effect-workflow-ui/
- Docker image: `ghcr.io/seethruhead/effect-workflow-ui`

![Needs attention: two failed runs, an overdue durable sleep and a stuck refund](docs/attention.png)

## Two ways to use it

### The Docker image

A single compiled server plus the viewer's files, for linux/amd64 and linux/arm64. Give it a connection string and
open port 4317.

```sh
docker run --rm -p 4317:4317 \
  -e CLUSTER_DATABASE_URL=postgres://viewer:password@db.internal:5432/app \
  ghcr.io/seethruhead/effect-workflow-ui:latest
```

On Postgres every read runs in a `READ ONLY` transaction, and the viewer only needs
`GRANT SELECT ON cluster_messages, cluster_replies, cluster_runners, cluster_locks` (the last two only feed the
cluster page, and are skipped if they are missing). For SQLite use `CLUSTER_DATABASE_URL=sqlite:/data/cluster.db`
and mount the directory that holds the database (not read-only: SQLite in WAL mode needs its `-wal` and `-shm`
files beside it, even when opened read-only). `CLUSTER_RECENT_HOURS` (default 168, a week) keeps reads small on a
big cluster: it reads runs that started in that window and every run that has not finished, whenever it started;
`0` reads everything. `VIEWER_TRACE_URL` is your tracing tool's URL with `{traceId}` (and optionally `{spanId}`)
where the ids go; each run page then links to its trace and to the selected step's span. `CLUSTER_TABLE_PREFIX`
sets a table prefix other than `cluster`; `PORT` and `HOST` set where it listens.

The viewer has four pages: needs attention, runs, a run, and the cluster: mailboxes per entity type, past-due
messages, and runners as live, silent (no heartbeat for 45 seconds; storage can still call a dead runner healthy)
or unhealthy, with the shards they hold. Shard ownership comes from the shard locks table, which Effect writes only
when Postgres advisory locks are off.

### Alerts, still read-only

- `GET /metrics` serves Prometheus gauges: `effect_workflow_runs{status}`, `effect_workflow_attention{concern}`,
  `effect_workflow_mailbox_unprocessed` and `_overdue` per entity type, `effect_workflow_oldest_overdue_seconds`,
  `effect_workflow_runners{state}` and `effect_workflow_unowned_shards`.
- `ALERT_WEBHOOK_URL` (checked every `ALERT_EVERY`, default one minute) receives one JSON POST per run that has
  newly failed, gone overdue or got stuck: `{ concern, workflow, runId, why, since }`. A run is sent once while its
  problem lasts and again only if it clears and comes back; restarts send current problems once more.

### The libraries

- `@effect-workflow/reader` reads the storage (`ClusterRepo` from `@effect-workflow/reader/repo`) and folds it into
  runs with two pure functions: `executions(storage, { workflows })` and `attention(runs, storage, now)`. Pass your
  `Workflow` definitions and inputs, results and errors are decoded with their own Schemas; a stored payload that no
  longer decodes is flagged.
- `@effect-workflow/ui` is the component kit the viewer is made of (run list, run header, timeline, attempts,
  failure panels, history), built with [Foldkit](https://foldkit.dev) and StyleX. It ships TypeScript source for
  your bundler.

The packages are ready for npm but not published yet; that waits on the maintainer. Until then, use them from this
repo's workspace.

## What it can and cannot tell you

Effect cluster keeps everything a workflow does as messages, and every message and reply id is a snowflake that
carries its time, so runs, attempts, sleeps, signals, results and errors all come from storage. Three things do not:
which signal a run is waiting on (storage names a signal only once it arrives), what a compensation undoes (a step
that started after another failed is marked as compensation), and an activity's input.

## This repo

- `apps/viewer`: the viewer (Foldkit) and its server (Bun, Effect RPC), also built as a static replay for the demo.
- `apps/sample`: a small shop on Effect cluster and workflow whose runs cover success, retries, durable sleeps, an
  entity completing a signal, compensation, a defect and a run that waits forever. Its recording is the demo's data.
- `apps/site`: the website, built with [Spar](https://github.com/SeeThruHead/spar) (pinned as a submodule in
  `vendor/spar`) and rendered to static HTML for GitHub Pages.
- `packages/ui`, `packages/reader`, `packages/client` (the one RPC the viewer uses).

```sh
git clone --recurse-submodules https://github.com/SeeThruHead/effect-workflow-ui
bun install
bun run check
bun run --cwd apps/sample start          # writes runs to apps/sample/.data/sample.db
CLUSTER_DATABASE_URL=sqlite:apps/sample/.data/sample.db bun run --cwd apps/viewer start
```
