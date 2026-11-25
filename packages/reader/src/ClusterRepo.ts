import { PgClient } from "@effect/sql-pg"
import { SqliteClient } from "@effect/sql-sqlite-bun"
import { Context, Effect, Layer, Predicate, Redacted, Schema, String as Str } from "effect"
import { SqlClient } from "effect/sql"
import { MessageRow, ReplyRow, type Storage } from "./Rows.ts"

export class ClusterRepoError extends Schema.TaggedError<ClusterRepoError, { readonly brand: unique symbol }>()(
  "ClusterRepoError",
  { table: Schema.String, cause: Schema.Defect() }
) {
  override get message() {
    const cause =
      Predicate.hasProperty(this.cause, "message") && Predicate.isString(this.cause.message)
        ? `: ${this.cause.message}`
        : ""

    return `could not read ${this.table} from the cluster's message storage${cause}`
  }
}

const Bit = Schema.Union([Schema.Boolean, Schema.Literals([0, 1])])

const StoredMessage = Schema.Struct({ ...MessageRow.fields, processed: Bit })

const toMessage = (row: typeof StoredMessage.Type): MessageRow => ({
  ...row,
  processed: row.processed === true || row.processed === 1
})

export type RepoOptions = { readonly prefix?: string }

export class ClusterRepo extends Context.Service<
  ClusterRepo,
  { readonly storage: Effect.Effect<Storage, ClusterRepoError> }
>()("effect-workflow/reader/ClusterRepo") {
  static readonly layer = (options?: RepoOptions) =>
    Layer.effect(
      ClusterRepo,
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const prefix = options?.prefix ?? "cluster"
        const messagesTable = `${prefix}_messages`
        const repliesTable = `${prefix}_replies`
        const decodeMessages = Schema.decodeUnknownEffect(Schema.Array(StoredMessage))
        const decodeReplies = Schema.decodeUnknownEffect(Schema.Array(ReplyRow))

        const messages = sql`
          SELECT CAST(id AS TEXT) AS "id", CAST(request_id AS TEXT) AS "requestId", entity_type AS "entityType",
            entity_id AS "entityId", tag, payload, processed, CAST(deliver_at AS DOUBLE PRECISION) AS "deliverAt"
          FROM ${sql(messagesTable)}`.pipe(
          Effect.flatMap(decodeMessages),
          Effect.mapBoth({
            onSuccess: (rows) => rows.map(toMessage),
            onFailure: (cause) => new ClusterRepoError({ table: messagesTable, cause })
          })
        )

        const replies = sql`
          SELECT CAST(id AS TEXT) AS "id", CAST(request_id AS TEXT) AS "requestId", payload
          FROM ${sql(repliesTable)}`.pipe(
          Effect.flatMap(decodeReplies),
          Effect.mapError((cause) => new ClusterRepoError({ table: repliesTable, cause }))
        )

        const readOnly = sql.onDialectOrElse({
          pg: () => sql`SET TRANSACTION READ ONLY`.pipe(Effect.asVoid),
          orElse: () => Effect.void
        })

        const read = Effect.andThen(readOnly, Effect.all({ messages, replies }, { concurrency: 1 }))

        return ClusterRepo.of({
          storage: sql.withTransaction(read).pipe(
            Effect.catchTag("SqlError", (cause) => Effect.fail(new ClusterRepoError({ table: messagesTable, cause }))),
            Effect.withSpan("ClusterRepo.storage")
          )
        })
      })
    )

  static readonly sqlite = (filename: string, options?: RepoOptions) =>
    ClusterRepo.layer(options).pipe(Layer.provide(SqliteClient.layer({ filename, readonly: true })))

  static readonly postgres = (url: Redacted.Redacted, options?: RepoOptions) =>
    ClusterRepo.layer(options).pipe(Layer.provide(PgClient.layer({ url, maxConnections: 2 })))

  static readonly fromUrl = (url: Redacted.Redacted, options?: RepoOptions) => {
    const text = Redacted.value(url)
    if (Str.startsWith("postgres://")(text)) return ClusterRepo.postgres(url, options)
    if (Str.startsWith("postgresql://")(text)) return ClusterRepo.postgres(url, options)

    return ClusterRepo.sqlite(Str.replace(/^sqlite:(\/\/)?/, "")(text), options)
  }
}
