#import "../core/errors.typ": check, closed, nonempty
#import "content.typ": scope, heading-block, fine-print, space, card
#import "media.typ": media, masthead

#let validate-party(person, contact: false) = {
  closed(person, if contact { ("name", "role", "lines", "email", "phone", "photo_asset") } else { ("name", "lines", "email", "phone") }, "party")
  check("name" in person and nonempty(person.name), "BRAND_REQUIRED_FIELD", "party.name", "required nonempty name")
  for key in ("role", "email", "phone", "photo_asset") {
    if key in person { check(type(person.at(key)) == str, "BRAND_INVALID_VALUE", "party." + key, "expected string") }
  }
  if "lines" in person { check(type(person.lines) == array and person.lines.all(v => type(v) == str), "BRAND_INVALID_VALUE", "party.lines", "expected string array") }
}
#let party(cfg, person, title: none) = {
  validate-party(person)
  scope(cfg, [
    #if title != none { fine-print(cfg, title); v(4pt) }
    #text(weight: "bold", person.name)
    #for line in person.at("lines", default: ()) { parbreak(); line }
    #for key in ("email", "phone") {
      if key in person and person.at(key) != "" { parbreak(); person.at(key) }
    }
  ])
}
#let party-grid(cfg, parties) = {
  check(type(parties) == array and parties.len() > 0, "BRAND_INVALID_VALUE", "parties", "expected ordered parties")
  for entry in parties {
    closed(entry, ("title", "party"), "parties.item")
    check("party" in entry, "BRAND_REQUIRED_FIELD", "parties.item.party", "party is required")
  }
  scope(cfg, grid(columns: (1fr,) * parties.len(), gutter: space(cfg), ..parties.map(entry => party(cfg, entry.party, title: entry.at("title", default: none)))))
}
#let contact(cfg, person) = {
  validate-party(person, contact: true)
  let copy = person
  let _ = copy.remove("role", default: none)
  let _ = copy.remove("photo_asset", default: none)
  card(cfg, [
    #if "photo_asset" in person {
      grid(columns: (70pt, 1fr), gutter: space(cfg),
        media(cfg, person.photo_asset, width: 70pt, height: 70pt, fit: "cover"),
        party(cfg, copy, title: person.at("role", default: none)))
    } else { party(cfg, copy, title: person.at("role", default: none)) }
  ], breakable: false)
}
#let signature(cfg, person, date: none) = {
  validate-party(person, contact: true)
  scope(cfg, block(breakable: false)[
    #v(space(cfg))
    #line(length: 180pt, stroke: cfg.tokens.shapes.thin_stroke + cfg.tokens.colors.border)
    #v(6pt)
    #text(weight: "bold", person.name)
    #if "role" in person { parbreak(); fine-print(cfg, person.role) }
    #if date != none { parbreak(); fine-print(cfg, cfg.strings.date + ": " + date) }
  ])
}
#let letterhead(cfg, title: none, subtitle: none, reference: none, date: none) = {
  check(nonempty(cfg.identity.at("name", default: "")), "BRAND_REQUIRED_FIELD", "brand.identity.name", "letterhead requires identity")
  scope(cfg, [
    #if cfg.identity.at("logo_asset", default: none) != none { media(cfg, cfg.identity.logo_asset, width: 90pt, height: 30pt); v(8pt) }
    #text(weight: "bold", fill: cfg.tokens.colors.primary, cfg.identity.name)
    #v(space(cfg, multiplier: 0.5))
    #masthead(cfg, title: title, subtitle: subtitle)
    #if reference != none { fine-print(cfg, reference); parbreak() }
    #if date != none { fine-print(cfg, cfg.strings.date + ": " + date) }
    #v(space(cfg))
  ])
}
#let self-contact = contact
#let cover(cfg, title: none, subtitle: none, date: none, contact: none) = {
  check(nonempty(cfg.identity.at("name", default: "")), "BRAND_REQUIRED_FIELD", "brand.identity.name", "cover requires identity")
  scope(cfg, [
    #v(32pt)
    #if cfg.identity.at("logo_asset", default: none) != none { media(cfg, cfg.identity.logo_asset, width: 120pt, height: 40pt); v(16pt) }
    #text(size: cfg.tokens.type.h3, weight: "bold", fill: cfg.tokens.colors.primary, cfg.identity.at("name", default: ""))
    #v(24pt)
    #text(font: cfg.tokens.fonts.heading, size: cfg.tokens.type.title, weight: "bold", title)
    #if subtitle != none { v(16pt); subtitle }
    #if date != none { v(16pt); fine-print(cfg, date) }
    #if contact != none { v(36pt); self-contact(cfg, contact) }
  ])
}
