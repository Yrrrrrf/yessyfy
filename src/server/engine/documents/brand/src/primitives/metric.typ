#let raw-metric(label, value, foreground: none, muted: none, size: none, small: none, gap: none) = {
  block(breakable: false)[
    #text(size: small, fill: muted, label)
    #v(gap)
    #text(size: size, weight: "bold", fill: foreground, value)
  ]
}
