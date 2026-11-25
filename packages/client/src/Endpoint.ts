import { Recording, StorageUnreadable } from "@effect-workflow/reader"
import { Rpc, RpcGroup } from "effect/rpc"

export const ReadRecording = Rpc.make("ReadRecording", { success: Recording, error: StorageUnreadable })

export const ViewerApi = RpcGroup.make(ReadRecording)

export const rpcPath = "/rpc"
