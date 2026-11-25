import stylex from "@stylexjs/unplugin/vite"
import { defineConfig } from "vite"

export default defineConfig({ plugins: [stylex({ devMode: "full" })] })
