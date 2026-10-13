#let raw-badge(body, foreground: none, background: none, border: none, padding: none, radius: none, size: none) = {
  box(fill: background, stroke: 0.5pt + border, inset: (x: padding, y: padding / 2), radius: radius,
    text(fill: foreground, size: size, weight: "bold", body))
}
