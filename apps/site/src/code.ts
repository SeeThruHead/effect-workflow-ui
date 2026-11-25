export const dockerPostgres = `docker run --rm -p 4317:4317 \\
  -e CLUSTER_DATABASE_URL=postgres://viewer:password@db.internal:5432/app \\
  ghcr.io/seethruhead/effect-workflow-ui:latest
# then open http://localhost:4317`

export const dockerSqlite = `docker run --rm -p 4317:4317 -v "$PWD/data:/data" \\
  -e CLUSTER_DATABASE_URL=sqlite:/data/cluster.db \\
  ghcr.io/seethruhead/effect-workflow-ui:latest`

export const grant = `CREATE ROLE viewer LOGIN PASSWORD 'password';
GRANT SELECT ON cluster_messages, cluster_replies, cluster_runners, cluster_locks TO viewer;`

export const reader = `import { attention, executions } from "@effect-workflow/reader"
import { ClusterRepo } from "@effect-workflow/reader/repo"
import { Clock, Config, Effect, Layer } from "effect"
import { PlaceOrder, ApproveRefund } from "./workflows.ts"

const needsAttention = Effect.gen(function* () {
  const repo = yield* ClusterRepo
  const storage = yield* repo.storage
  const now = yield* Clock.currentTimeMillis
  const runs = executions(storage, { workflows: [PlaceOrder, ApproveRefund] })

  return attention(runs, storage, now)
})

const cluster = Layer.unwrap(
  Effect.map(Config.Redacted("DATABASE_URL"), (url) => ClusterRepo.fromUrl(url))
)

export const program = needsAttention.pipe(Effect.provide(cluster))`

export const kit = `import { History, RunHeader, Timeline } from "@effect-workflow/ui"
import type { Execution } from "@effect-workflow/ui"
import type { HtmlBuilder } from "foldkit/html"

export const RunPage = <M>(h: HtmlBuilder<M>, run: Execution, now: number, on: Handlers<M>) =>
  h.div([], [
    RunHeader(h, { run, now, actions: [] }),
    Timeline(h, { groups: run.groups, range: { start: run.startedAt, end: run.endedAt ?? now },
      now, selected: on.selected, newestFirst: false, onSelect: on.select, onToggleOrder: on.order }),
    History(h, { run, now, view: "events", newestFirst: false, open: null,
      onView: on.view, onToggleOrder: on.order, onOpen: on.open })
  ])`
