import { Recording } from "@effect-workflow/reader"
import { Effect, Schema } from "effect"
import { Command } from "foldkit"
import { load, pushUrl } from "foldkit/navigation"
import { Message } from "./Message.ts"
import { Source, unreadable } from "./Source.ts"

const Succeeded = Schema.TaggedStruct("SucceededReadRecording", { recording: Recording })

const Failed = Schema.TaggedStruct("FailedReadRecording", { message: Schema.String })

const Completed = Schema.TaggedStruct("CompletedNavigation", {})

export const ReadRecording = Command.define("ReadRecording", {
  messages: [Succeeded, Failed],
  execute: Effect.gen(function* () {
    const source = yield* Source

    return yield* source.read.pipe(
      Effect.match({
        onSuccess: (recording) => Message.SucceededReadRecording({ recording }),
        onFailure: (error) => Message.FailedReadRecording({ message: unreadable(error) })
      })
    )
  })
})

export const PushUrl = Command.define("PushUrl", {
  args: { href: Schema.String },
  messages: [Completed],
  execute: ({ href }) => pushUrl(href).pipe(Effect.as(Message.CompletedNavigation()))
})

export const LoadUrl = Command.define("LoadUrl", {
  args: { href: Schema.String },
  messages: [Completed],
  execute: ({ href }) => load(href).pipe(Effect.as(Message.CompletedNavigation()))
})
