import { BunRuntime, BunServices } from "@effect/platform-bun"
import { Effect, FileSystem, Path } from "effect"
import { Renderer, Server } from "spar"
import { Home } from "../src/Home.tsx"

const description =
  "A read-only viewer for Effect cluster and Effect workflow runs: a Docker image and the libraries it is built from."

const page = (body: string): string =>
  [
    "<!doctype html>",
    '<html lang="en">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Effect workflow UI</title>",
    `<meta name="description" content="${description}">`,
    '<link rel="stylesheet" href="site.css"></head>',
    `<body>${body}</body></html>`
  ].join("")

const build = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const root = path.join(import.meta.dirname, "..")
  const out = path.join(root, "dist")
  const demo = path.join(root, "../viewer/dist/recorded")
  const body = yield* Server.renderToString(Home, { layer: Renderer.html })
  yield* fs.remove(out, { recursive: true, force: true })
  yield* fs.makeDirectory(out, { recursive: true })
  yield* fs.writeFileString(path.join(out, "index.html"), page(body))
  yield* fs.copyFile(path.join(root, "src/site.css"), path.join(out, "site.css"))
  yield* fs.copy(path.join(root, "public"), out)
  yield* fs.copy(demo, path.join(out, "demo"))
  yield* fs.writeFileString(path.join(out, ".nojekyll"), "")
  yield* Effect.log(`built the site into ${out}`)
})

BunRuntime.runMain(build.pipe(Effect.provide(BunServices.layer)))
