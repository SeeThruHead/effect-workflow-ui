import type { DecodableWorkflow } from "@effect-workflow/reader"
import { workflows as shopWorkflows } from "@effect-workflow/sample/Api.ts"

export type Mode = {
  readonly live: boolean
  readonly brand: string
  readonly recording: string
  readonly workflows: ReadonlyArray<DecodableWorkflow>
}

const recordings: Readonly<Record<string, Omit<Mode, "live" | "workflows">>> = {
  shop: { brand: "Sample shop (recorded)", recording: "./recording.json" },
  cluster: { brand: "Three runners, one killed (recorded)", recording: "./recording-cluster.json" }
}

export const recorded = (name: string): Mode => ({
  live: false,
  workflows: shopWorkflows,
  ...(recordings[name] ?? { brand: "Sample shop (recorded)", recording: "./recording.json" })
})

export const live: Mode = { live: true, brand: "Effect workflow viewer", recording: "", workflows: [] }
