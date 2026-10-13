#let raw-media(path, width: 100%, height: auto, fit: "contain", caption: none, caption-size: 8.5pt, caption-color: gray) = {
  image(path, width: width, height: height, fit: fit)
  if caption != none {
    v(4pt)
    text(size: caption-size, fill: caption-color, caption)
  }
}
