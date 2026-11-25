import type { Execution, Failure } from "@effect-workflow/ui"
import { Option, Predicate, Schema } from "effect"
export type Pure = Schema.Codec<unknown>

export type DecodableWorkflow = {
  readonly _tag: string
  readonly payloadSchema: Pure
  readonly successSchema: Pure
  readonly errorSchema: Pure
}

type Decoded = { readonly ok: boolean; readonly value: unknown }

const decodeJson = (schema: Pure, value: unknown): Decoded =>
  Option.match(Schema.decodeUnknownOption(Schema.toCodecJson(schema))(value), {
    onNone: () => ({ ok: false, value }),
    onSome: (decoded) => ({ ok: true, value: decoded })
  })

const decodedMessage = (value: unknown, fallback: string): string =>
  Predicate.hasProperty(value, "message") && Predicate.isString(value.message) && value.message !== ""
    ? value.message
    : fallback

const decodeFailure = (
  workflow: DecodableWorkflow,
  failure: Failure
): { readonly ok: boolean; readonly failure: Failure } => {
  if (failure.kind !== "failure") return { ok: true, failure }
  if (failure.detail === undefined) return { ok: true, failure }
  const decoded = decodeJson(workflow.errorSchema, failure.detail)
  if (!decoded.ok) return { ok: false, failure }

  return { ok: true, failure: { ...failure, message: decodedMessage(decoded.value, failure.message) } }
}

const decodeExecution = (workflow: DecodableWorkflow, execution: Execution): Execution => {
  const input = decodeJson(workflow.payloadSchema, execution.input)
  const result = execution.result === undefined ? undefined : decodeJson(workflow.successSchema, execution.result)
  const failure = execution.failure === undefined ? undefined : decodeFailure(workflow, execution.failure)
  const ok = input.ok && (result?.ok ?? true) && (failure?.ok ?? true)

  return {
    ...execution,
    input: input.value,
    ...(result ? { result: result.value } : {}),
    ...(failure ? { failure: failure.failure } : {}),
    payloads: ok ? "decoded" : "mismatch"
  }
}

export const decodedWith =
  (workflows: ReadonlyArray<DecodableWorkflow>) =>
  (execution: Execution): Execution =>
    Option.match(Option.fromUndefinedOr(workflows.find((workflow) => workflow._tag === execution.workflow)), {
      onNone: () => execution,
      onSome: (workflow) => decodeExecution(workflow, execution)
    })
