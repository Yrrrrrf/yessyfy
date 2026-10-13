#import "errors.typ": check, closed, nonempty, object
#import "assets.typ": validate-assets
#import "../theme/resolver.typ": resolve-brand
#import "../theme/ui.typ": bind-ui
#import "../i18n/i18n.typ": resolve-catalog

#let validate-identity(identity) = {
  closed(identity, ("name", "tagline", "logo_asset", "contact", "address_lines"), "brand.identity")
  for key in ("name", "tagline") {
    if key in identity { check(type(identity.at(key)) == str, "BRAND_INVALID_VALUE", "brand.identity." + key, "expected string") }
  }
  if "logo_asset" in identity and identity.logo_asset != none { check(nonempty(identity.logo_asset), "BRAND_INVALID_VALUE", "brand.identity.logo_asset", "expected logical ID or none") }
  if "contact" in identity {
    closed(identity.contact, ("email", "phone", "website"), "brand.identity.contact")
    check(identity.contact.values().all(v => type(v) == str), "BRAND_INVALID_VALUE", "brand.identity.contact", "expected contact strings")
  }
  if "address_lines" in identity { check(type(identity.address_lines) == array and identity.address_lines.all(v => type(v) == str), "BRAND_INVALID_VALUE", "brand.identity.address_lines", "expected ordered strings") }
  identity
}
#let make-brand(preset: "corporate", identity: (:), tokens: (:), locale: "en", assets: (:), catalog: (:)) = {
  let identity = validate-identity(identity)
  let assets = validate-assets(assets)
  if identity.at("logo_asset", default: none) != none {
    check(identity.logo_asset in assets, "BRAND_ASSET_MISSING", "brand.identity.logo_asset", "logo is not staged")
  }
  let tokens = resolve-brand(preset: preset, tokens: tokens)
  let cfg = (
    identity: identity, tokens: tokens,
    space: tokens.spacing.base * (compact: 0.75, comfortable: 1.0, spacious: 1.25).at(tokens.spacing.density),
    locale: locale, assets: assets, strings: resolve-catalog(locale, extra: catalog),
  )
  (__brand_kit: true, identity: identity, tokens: cfg.tokens, locale: locale, assets: assets, ..bind-ui(cfg))
}
#let inspect-brand(kit) = (identity: kit.identity, tokens: kit.tokens, locale: kit.locale)
