#let raw-card(body, title: none, fill: none, stroke: none, radius: 0pt, inset: 12pt, breakable: true, title-size: 12pt) = {
  block(width: 100%, fill: fill, stroke: stroke, radius: radius, inset: inset, breakable: breakable)[
    #if title != none { block(sticky: true, text(size: title-size, weight: "bold", title)); v(inset / 2) }
    #body
  ]
}
