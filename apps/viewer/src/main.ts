import { Effect, Schema, Stream } from "effect"
import { Runtime, Subscription } from "foldkit"
import { Message } from "./app/Message.ts"
import { live, recorded } from "./app/Mode.ts"
import { Model } from "./app/Model.ts"
import { Source } from "./app/Source.ts"
import { init, update } from "./app/update.ts"
import { view } from "./app/view.ts"

const isRecorded = import.meta.env.MODE === "recorded"

const mode = isRecorded ? recorded : live

const subscriptions = Subscription.make<Model, Message>()((entry) => ({
  refresh: entry(
    { live: Schema.Boolean },
    {
      modelToDependencies: () => ({ live: mode.live }),
      dependenciesToStream: (dependencies) =>
        dependencies.live
          ? Stream.tick("5 seconds").pipe(
              Stream.drop(1),
              Stream.mapEffect(() => Effect.succeed(Message.Ticked()))
            )
          : Stream.empty
    }
  )
}))

Runtime.run(
  Runtime.makeApplication({
    Model,
    init,
    update,
    view: view(mode),
    subscriptions,
    routing: {
      onUrlRequest: (request) => Message.ClickedLink({ request }),
      onUrlChange: (url) => Message.ChangedUrl({ url })
    },
    resources: isRecorded ? Source.recorded("./recording.json") : Source.live,
    container: document.getElementById("root")
  })
)
