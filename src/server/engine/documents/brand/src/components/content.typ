#import "../core/errors.typ": check, closed, nonempty
#import "../primitives/card.typ": raw-card
#import "../primitives/badge.typ": raw-badge
#import "../primitives/metric.typ": raw-metric
#let native-heading = heading
#let scope(cfg, body) = {
  set text(font: cfg.tokens.fonts.body, size: cfg.tokens.type.body, fill: cfg.tokens.colors.text, lang: cfg.locale)
  body
}
#let space(cfg, multiplier: 1) = {
  check(type(multiplier) in (int, float) and multiplier >= 0, "BRAND_INVALID_VALUE", "space.multiplier", "expected nonnegative number")
  cfg.space * multiplier
}
#let intent(cfg, name) = {
  check(name in cfg.tokens.colors.intents, "BRAND_INVALID_VALUE", "intent", "unknown intent")
  cfg.tokens.colors.intents.at(name)
}
#let heading-block(cfg, body, level: 1) = {
  check(type(level) == int and level >= 1 and level <= 3, "BRAND_INVALID_VALUE", "heading.level", "expected level 1 to 3")
  let sizes = (cfg.tokens.type.h1, cfg.tokens.type.h2, cfg.tokens.type.h3)
  native-heading(level: level, numbering: none, text(font: cfg.tokens.fonts.heading, fill: cfg.tokens.colors.text, size: sizes.at(level - 1), weight: "bold", lang: cfg.locale, body))
}
#let section(cfg, id: none, title: none, level: 1, body) = {
  check(type(id) == str and id.match(regex("^[a-z][a-z0-9_-]*$")) != none, "BRAND_INVALID_VALUE", "section.id", "invalid section ID")
  let lbl = label("brand-section-" + id)
  [
    #heading-block(cfg, title, level: level)#lbl
    #context check(query(lbl).len() == 1, "BRAND_DUPLICATE_SECTION", "section." + id, "section ID appears more than once")
    #scope(cfg, body)
  ]
}
#let body-text(cfg, body) = scope(cfg, body)
#let fine-print(cfg, body) = {
  set text(font: cfg.tokens.fonts.body, size: cfg.tokens.type.small, fill: cfg.tokens.colors.muted, lang: cfg.locale)
  body
}
#let self-intent = intent
#let card(cfg, body, title: none, intent: "neutral", breakable: true) = {
  let palette = self-intent(cfg, intent)
  scope(cfg, raw-card(text(fill: palette.foreground, body), title: if title == none { none } else { text(fill: palette.foreground, title) }, fill: palette.background, stroke: cfg.tokens.shapes.thin_stroke + palette.border, radius: cfg.tokens.shapes.card_radius, inset: space(cfg), breakable: breakable, title-size: cfg.tokens.type.h3))
}
#let badge(cfg, body, intent: "neutral") = {
  let palette = self-intent(cfg, intent)
  scope(cfg, raw-badge(body, foreground: palette.foreground, background: palette.background, border: palette.border, padding: space(cfg, multiplier: 0.5), radius: cfg.tokens.shapes.badge_radius, size: cfg.tokens.type.small))
}
#let metric(cfg, label, value, intent: "neutral") = {
  let palette = self-intent(cfg, intent)
  scope(cfg, raw-metric(label, value, foreground: palette.foreground, muted: cfg.tokens.colors.muted, size: cfg.tokens.type.metric, small: cfg.tokens.type.small, gap: space(cfg, multiplier: 0.3)))
}
#let facts(cfg, items, columns: 4) = {
  check(type(items) == array and type(columns) == int and columns > 0, "BRAND_INVALID_VALUE", "facts", "expected ordered items and positive columns")
  for item in items {
    closed(item, ("label", "value"), "facts.item")
    check("label" in item and "value" in item and nonempty(item.label) and type(item.value) in (str, content), "BRAND_INVALID_VALUE", "facts.item", "expected label and literal value")
  }
  scope(cfg, grid(columns: (1fr,) * columns, gutter: space(cfg), ..items.map(item => [
    #fine-print(cfg, item.label)
    #v(3pt)
    #text(weight: "bold", item.value)
  ])))
}
#let note(cfg, body, title: none, intent: "neutral") = {
  card(cfg, fine-print(cfg, body), title: title, intent: intent)
}
