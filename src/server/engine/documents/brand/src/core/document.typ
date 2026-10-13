#import "errors.typ": check
#import "metadata.typ": validate-meta
#import "../utils/formatters.typ": validate-timestamp
#import "../theme/resolver.typ": check-page

#let page-numbers(cfg) = context {
  let current = counter(page).get().first()
  let total = counter(page).final().first()
  text(font: cfg.tokens.fonts.body, size: cfg.tokens.type.small, fill: cfg.tokens.colors.muted, lang: cfg.locale,
    cfg.strings.page + " " + str(current) + " " + cfg.strings.of + " " + str(total))
}
#let default-header(cfg) = {
  if cfg.identity.at("name", default: "") != "" {
    set text(font: cfg.tokens.fonts.body, size: cfg.tokens.type.small, fill: cfg.tokens.colors.muted)
    grid(columns: (1fr, auto), gutter: 8pt,
      text(weight: "bold", fill: cfg.tokens.colors.primary, cfg.identity.name),
      cfg.identity.at("tagline", default: ""),
    )
    v(4pt)
    line(length: 100%, stroke: cfg.tokens.shapes.thin_stroke + cfg.tokens.colors.border)
  }
}
#let default-footer(cfg, numbers) = {
  set text(font: cfg.tokens.fonts.body, size: cfg.tokens.type.small, fill: cfg.tokens.colors.muted)
  let contact = cfg.identity.at("contact", default: (:))
  let values = contact.values().filter(v => v != "")
  let address = cfg.identity.at("address_lines", default: ())
  grid(columns: (1fr, auto), gutter: 8pt,
    (address + values).join(" · "),
    if numbers { page-numbers(cfg) } else { [] },
  )
}
#let document-wrap(cfg, meta: (:), header: auto, footer: auto, body) = {
  let meta = validate-meta(meta)
  let tokens = cfg.tokens
  let paper = meta.at("paper", default: tokens.page.paper)
  check-page(paper, tokens.page.margin)
  set document(
    title: meta.at("title", default: none),
    author: meta.at("author", default: cfg.identity.at("name", default: "")),
    description: meta.at("subject", default: none),
    keywords: meta.at("keywords", default: ()),
    date: if "created_at" in meta { validate-timestamp(meta.created_at) } else { none },
  )
  let watermark = meta.watermark
  set page(
    paper: paper, margin: tokens.page.margin, fill: tokens.colors.page,
    header: if header == auto { default-header(cfg) } else { header },
    footer: if footer == auto { default-footer(cfg, meta.page_numbers) } else { footer },
    header-ascent: tokens.page.header_gap, footer-descent: tokens.page.footer_gap,
    background: if watermark != none {
      align(center + horizon, rotate(-35deg, text(font: tokens.fonts.heading, fill: tokens.colors.muted.transparentize(87%), size: 42pt, weight: "bold", watermark)))
    },
  )
  set text(font: tokens.fonts.body, size: tokens.type.body, fill: tokens.colors.text, lang: cfg.locale)
  set par(leading: tokens.type.leading, spacing: tokens.type.paragraph_gap)
  set heading(numbering: none)
  show heading: it => {
    let size = if it.level == 1 { tokens.type.h1 } else if it.level == 2 { tokens.type.h2 } else { tokens.type.h3 }
    set text(font: tokens.fonts.heading, size: size, weight: "bold", fill: tokens.colors.text)
    it
  }
  body
}
#let page-zone(cfg, paper: auto, header: auto, footer: auto, body) = {
  let rules = (:)
  if paper != auto {
    check-page(paper, cfg.tokens.page.margin)
    rules.insert("paper", paper)
  }
  if header != auto { rules.insert("header", header) }
  if footer != auto { rules.insert("footer", footer) }
  set page(..rules)
  body
}
