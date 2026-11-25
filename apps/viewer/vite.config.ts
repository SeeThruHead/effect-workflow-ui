import stylex from "@stylexjs/unplugin/vite"
import { defineConfig } from "vite"

export default defineConfig(({ mode }) => ({
  plugins: [stylex()],
  publicDir: mode === "recorded" ? "recorded" : false,
  server: { proxy: { "/rpc": process.env["VIEWER_RPC_TARGET"] ?? "http://127.0.0.1:4317" } }
}))
