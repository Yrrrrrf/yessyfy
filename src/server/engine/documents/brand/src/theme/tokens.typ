#let default-tokens = (
  colors: (
    primary: rgb("#0066cc"), accent: rgb("#00cc99"), text: rgb("#1a1a1a"),
    muted: rgb("#666666"), on_primary: rgb("#ffffff"), page: rgb("#ffffff"),
    surface: rgb("#f5f5f5"), border: rgb("#cccccc"), alternate: rgb("#f5f5f5"),
    intents: (
      neutral: (foreground: rgb("#404040"), background: rgb("#f5f5f5"), border: rgb("#cccccc")),
      success: (foreground: rgb("#166534"), background: rgb("#f0fdf4"), border: rgb("#86efac")),
      warning: (foreground: rgb("#854d0e"), background: rgb("#fefce8"), border: rgb("#fde047")),
      danger: (foreground: rgb("#991b1b"), background: rgb("#fef2f2"), border: rgb("#fca5a5")),
      info: (foreground: rgb("#075985"), background: rgb("#f0f9ff"), border: rgb("#7dd3fc")),
    ),
  ),
  fonts: (body: ("DejaVu Sans",), heading: ("DejaVu Sans",), mono: ("DejaVu Sans Mono",)),
  type: (body: 10pt, small: 8.5pt, h1: 24pt, h2: 18pt, h3: 14pt, title: 30pt, metric: 24pt, leading: 6pt, paragraph_gap: 8pt),
  page: (paper: "us-letter", margin: 18mm, header_gap: 8pt, footer_gap: 8pt),
  spacing: (base: 12pt, density: "comfortable"),
  shapes: (card_radius: 6pt, badge_radius: 4pt, thin_stroke: 0.5pt, normal_stroke: 1pt),
  table: (cell_padding: 8pt, header_background: rgb("#0066cc"), header_foreground: rgb("#ffffff"), alternate_background: rgb("#f5f5f5")),
  media: (caption_size: 8.5pt, caption_color: rgb("#666666"), default_fit: "contain"),
)
