# Two things cluster storage does not tell you about runners

Found while testing the viewer's cluster page against a real three-runner cluster on Postgres, with Effect 4.1.4
(`effect/cluster`, `BunClusterSocket.layer({ storage: "sql" })`). Both change what a tool reading
`cluster_runners` and `cluster_locks` can claim.

## 1. A runner that dies can stay `healthy = true` for minutes

When a runner process is killed (SIGKILL, so it cannot shut down cleanly), what reliably changes in
`cluster_runners` is `last_heartbeat`: it stops, while the live runners' heartbeats move on roughly every 10
seconds. The `healthy` flag is not reliable. In three runs of the same test:

| Run | Advisory locks | `healthy` 60 s after the kill | 120 s after |
| --- | --- | --- | --- |
| 1 | on | true | true |
| 2 | off | true | true |
| 3 | off | false | not checked |

The heartbeat had stopped in every run. So `healthy` alone does not tell you a runner is gone. The viewer treats a
runner as **silent** when its last heartbeat is more than 45 seconds old (about four missed beats), whatever
`healthy` says, and calls it **unhealthy** when the flag itself is false.

## 2. With Postgres advisory locks, `cluster_locks` stays empty

Effect's SQL runner storage takes shard locks as Postgres advisory locks by default. In that mode it writes no rows
to `cluster_locks`, so which runner holds which shard is not in storage at all: every runner shows zero shards. The
locks live in `pg_locks` as advisory locks keyed by numbers, with nothing in the table that maps them to a runner
address.

With `shardLockDisableAdvisory: true`, Effect writes one `cluster_locks` row per shard (`shard_id`, `address`,
`acquired_at`), and ownership is readable. In the same test with advisory locks off, the killed runner's four shards
moved to the other two runners within a minute: 4/4/4 before the kill, 6/0/6 after.

The viewer reads ownership only from `cluster_locks`. When runners are registered but the table is empty, it says
ownership is not in storage rather than calling every shard unowned.

## Reproduce it

Needs Docker and Bun, from a checkout of this repo after `bun install`.

```sh
docker run -d --rm --name shop-db -e POSTGRES_PASSWORD=sample -e POSTGRES_DB=shop \
  -p 127.0.0.1:55433:5432 postgres:17
until docker exec shop-db pg_isready -U postgres -d shop -h 127.0.0.1; do sleep 1; done

cd apps/sample
export SAMPLE_DB=postgres://postgres:sample@127.0.0.1:55433/shop
export SAMPLE_ORDER_EVERY="10 seconds"
export SAMPLE_ADVISORY_LOCKS=false   # leave this out to see finding 2

SAMPLE_RUNNER_PORT=34431 SAMPLE_SEED=true  bun src/app/server.ts &
SAMPLE_RUNNER_PORT=34432 SAMPLE_SEED=false bun src/app/server.ts & B=$!
SAMPLE_RUNNER_PORT=34433 SAMPLE_SEED=false bun src/app/server.ts &
sleep 60

query="select address, healthy, last_heartbeat,
  (select count(*) from cluster_locks l where l.address = r.address) as shards
  from cluster_runners r order by address"
docker exec shop-db psql -U postgres -d shop -c "$query"

kill -9 $B
sleep 60
docker exec shop-db psql -U postgres -d shop -c "$query"
```

The second query shows the killed runner (port 34432) with a `last_heartbeat` a minute old and no shards, while the
other two hold all twelve (4/4/4 in the first query, 6/0/6 in the second, in the run checked for this note).
`healthy` may still say `t` or may already say `f`; run it a few times to see both. Without
`SAMPLE_ADVISORY_LOCKS=false`, every `shards` count is 0 in both queries.

The recording behind the site's second demo (`apps/sample/src/fixtures/recording-cluster.json`) was made this way,
and `apps/sample/src/MultiRunner.test.ts` checks the viewer reads it as described.
