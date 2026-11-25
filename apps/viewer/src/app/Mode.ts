import type { DecodableWorkflow } from "@effect-workflow/reader"
import { workflows as shopWorkflows } from "@effect-workflow/sample/Api.ts"

export type Mode = {
  readonly live: boolean
  readonly brand: string
  readonly workflows: ReadonlyArray<DecodableWorkflow>
}

export const recorded: Mode = { live: false, brand: "Sample shop (recorded)", workflows: shopWorkflows }

export const live: Mode = { live: true, brand: "Effect workflow viewer", workflows: [] }
