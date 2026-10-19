// next/font only works inside Next's compiler, so tests get fonts that set no styles.
function createFont() {
  return { className: "", style: { fontFamily: "sans-serif" }, variable: "" };
}

export { createFont as Inter };
