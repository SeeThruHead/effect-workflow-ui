import type { Meta, StoryObj } from "@storybook/html-vite"
import { story } from "../stories/harness.ts"
import { Chip, StatusBadge } from "./Basics.ts"
import type { Status } from "./model.ts"

const meta: Meta = { title: "Workflow/Status" }
export default meta

const row = { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }

const all: ReadonlyArray<readonly [Status, boolean]> = [
  ["queued", false],
  ["running", true],
  ["waiting", true],
  ["retrying", true],
  ["done", false],
  ["accepted", false],
  ["failed", false],
  ["interrupted", false],
  ["compensating", true],
  ["suspended", false]
]

export const AllTen: StoryObj = {
  render: story(({ h }) =>
    h.div(
      [h.Style(row)],
      all.map(([status, live]) => StatusBadge(h, { status, live }))
    )
  )
}

export const Chips: StoryObj = {
  render: story(({ h }) =>
    h.div(
      [h.Style(row)],
      ["↻3", "boot a03c11e2", "retryable", "defect (a bug)", "survived 1 restart"].map((text) => Chip(h, { text }))
    )
  )
}
