#import "tokens.typ": default-tokens
#import "brand-packs/corporate.typ" as corporate
#import "brand-packs/minimal.typ" as minimal
#import "brand-packs/editorial.typ" as editorial
#import "../core/errors.typ": check, closed, object, finite
#import "../core/resolve.typ": merge, provided

#let papers = (a4: (210mm, 297mm), "us-letter": (215.9mm, 279.4mm), a5: (148mm, 210mm))
#let margin-sides(value, path: "brand.tokens.page.margin") = {
  if type(value) == length {
    check(value >= 0pt and value == value.abs, "BRAND_INVALID_VALUE", path, "expected nonnegative absolute length")
    return (top: value, right: value, bottom: value, left: value)
  }
  closed(value, ("top", "right", "bottom", "left"), path)
  check(value.keys().len() == 4, "BRAND_INVALID_VALUE", path, "all four margin sides are required")
  for key in value.keys() {
    let v = value.at(key)
    check(type(v) == length, "BRAND_INVALID_VALUE", path + "." + key, "expected length")
    check(v >= 0pt and v == v.abs, "BRAND_INVALID_VALUE", path + "." + key, "expected nonnegative absolute length")
  }
  value
}
#let check-page(paper, margin) = {
  check(type(paper) == str and paper in papers, "BRAND_INVALID_VALUE", "page.paper", "expected a4, us-letter or a5")
  let sides = margin-sides(margin)
  let size = papers.at(paper)
  check(sides.left + sides.right < size.first() and sides.top + sides.bottom < size.last(), "BRAND_INVALID_VALUE", "page.margin", "must leave a positive page area")
}
#let check-tokens(value, reference: default-tokens, path: "brand.tokens") = {
  for (key, expected) in reference {
    let v = value.at(key)
    let here = path + "." + key
    if here == "brand.tokens.page.margin" { let _ = margin-sides(v, path: here) }
    else if type(expected) == dictionary { check-tokens(v, reference: expected, path: here) }
    else if type(expected) == color { check(type(v) == color, "BRAND_INVALID_VALUE", here, "expected color") }
    else if type(expected) == length {
      check(type(v) == length, "BRAND_INVALID_VALUE", here, "expected absolute length")
      check(v >= 0pt and v == v.abs, "BRAND_INVALID_VALUE", here, "expected nonnegative absolute length")
      if path == "brand.tokens.type" and key not in ("leading", "paragraph_gap") or here == "brand.tokens.spacing.base" {
        check(v > 0pt, "BRAND_INVALID_VALUE", here, "must be positive")
      }
    } else if type(expected) == array {
      check(type(v) == array and v.len() > 0 and v.all(x => type(x) == str and x.trim() != ""), "BRAND_INVALID_VALUE", here, "expected nonempty font-family array")
    } else { check(type(v) == type(expected), "BRAND_INVALID_VALUE", here, "wrong token type") }
  }
  if path == "brand.tokens" {
  check(value.spacing.density in ("compact", "comfortable", "spacious"), "BRAND_INVALID_VALUE", "brand.tokens.spacing.density", "unknown density")
  check(value.media.default_fit in ("contain", "cover"), "BRAND_INVALID_VALUE", "brand.tokens.media.default_fit", "unknown fit")
  check-page(value.page.paper, value.page.margin)
  }
}
#let resolve-brand(preset: "corporate", tokens: (:)) = {
  let packs = (corporate: corporate.brand, minimal: minimal.brand, editorial: editorial.brand)
  check(type(preset) == str and preset in packs, "BRAND_UNKNOWN_PRESET", "brand.preset", "expected corporate, minimal or editorial")
  let pack = packs.at(preset)
  let resolved = merge(merge(default-tokens, pack), tokens)
  if not provided(tokens, ("table", "header_background")) and not provided(pack, ("table", "header_background")) {
    resolved.table.insert("header_background", resolved.colors.primary)
  }
  check-tokens(resolved)
  resolved
}
#let convert-length(value, path) = {
  closed(value, ("value", "unit"), path)
  check("value" in value and "unit" in value and finite(value.value), "BRAND_INVALID_VALUE", path, "expected finite value and unit")
  let units = (pt: 1pt, mm: 1mm, cm: 1cm)
  check(type(value.unit) == str and value.unit in units, "BRAND_INVALID_VALUE", path + ".unit", "expected pt, mm or cm")
  value.value * units.at(value.unit)
}

#let convert-tokens(value, reference: default-tokens, path: "brand.tokens") = {
  object(value, path)
  let result = (:)
  for (key, v) in value {
    check(key in reference, "BRAND_UNKNOWN_TOKEN", path + "." + key, "unknown token")
    let expected = reference.at(key)
    let here = path + "." + key
    if here == "brand.tokens.page.margin" and type(v) == dictionary and "value" not in v {
      closed(v, ("top", "right", "bottom", "left"), here)
      let sides = (:)
      for (side, val) in v { sides.insert(side, convert-length(val, here + "." + side)) }
      result.insert(key, sides)
    } else if type(expected) == dictionary { result.insert(key, convert-tokens(v, reference: expected, path: here)) }
    else if type(expected) == color {
      check(type(v) == str and v.match(regex("^#[0-9A-Fa-f]{6}$")) != none, "BRAND_INVALID_VALUE", here, "expected #RRGGBB")
      result.insert(key, rgb(v))
    } else if type(expected) == length { result.insert(key, convert-length(v, here)) }
    else { result.insert(key, v) }
  }
  result
}
