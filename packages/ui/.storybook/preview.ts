import "virtual:stylex:runtime"
import "../src/theme/base.css"

export default {
  parameters: { layout: "fullscreen" },
  globalTypes: {
    scheme: {
      description: "Colour scheme",
      toolbar: { title: "Scheme", icon: "mirror", items: ["light", "dark"], dynamicTitle: true }
    }
  },
  initialGlobals: { scheme: "light" }
}
