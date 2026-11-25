import type { Meta, StoryObj } from "@storybook/html-vite"
import { story } from "../stories/harness.ts"
import { StatusSwatches, SurfaceSwatches } from "./Agent.ts"

const meta: Meta = { title: "Workflow/Colour" }
export default meta

export const StatusTokens: StoryObj = { render: story(({ h }) => StatusSwatches(h)) }

export const SurfaceTokens: StoryObj = { render: story(({ h }) => SurfaceSwatches(h)) }
