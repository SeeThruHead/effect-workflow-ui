import { Schema } from "effect"
import { Tool, Toolkit } from "effect/ai"
import { HttpApiEndpoint } from "effect/http-api"
import { Rpc, RpcGroup } from "effect/rpc"

export const ping = Rpc.make("ping", { success: Schema.String })
export const group = RpcGroup.make(ping)
export const tool = Tool.make("ping", { success: Schema.String })
export const toolkit = Toolkit.make(tool)
export const endpoint = HttpApiEndpoint.get("ping", "/ping")
