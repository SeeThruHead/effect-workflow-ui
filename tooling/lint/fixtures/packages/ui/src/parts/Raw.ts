const stylex = { create: (styles: object): object => styles }
const space = { s8: "8px" }
export const styles = stylex.create({
  padded: { padding: "12px", gap: space.s8, width: "100%", flex: "1" },
  ring: { boxShadow: `0 0 0 2px ${space.s8}`, borderRadius: 0 },
  layered: { zIndex: 30, opacity: 0.5, transitionDuration: "200ms" },
  calm: { zIndex: 1, opacity: 1, color: "inherit", gridTemplateColumns: "minmax(0, 1fr)" },
  coloured: { color: "#ff0000", backgroundColor: "rgba(0, 0, 0, 0.1)" }
})
