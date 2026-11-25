import { PgClient } from "@effect/sql-pg"
import { SqliteClient } from "@effect/sql-sqlite-bun"
import { Config, Effect, FileSystem, Layer, Path, Redacted, String as Str } from "effect"
import { SqlClient } from "effect/sql"

const location = Config.Redacted("SAMPLE_DB").pipe(Config.withDefault(Redacted.make(".data/sample.db")))

const sqlite = (file: string) =>
  Layer.unwrap(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      yield* fs.makeDirectory(path.dirname(file), { recursive: true })

      return SqliteClient.layer({ filename: file })
    })
  )

const fromUrl = (url: Redacted.Redacted): Layer.Layer<SqlClient.SqlClient, never, FileSystem.FileSystem | Path.Path> =>
  Str.startsWith("postgres")(Redacted.value(url))
    ? Layer.orDie(PgClient.layer({ url }))
    : Layer.orDie(sqlite(Redacted.value(url)))

export const Database = Layer.unwrap(Effect.map(location, fromUrl))
