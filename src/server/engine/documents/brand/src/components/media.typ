#import "../core/errors.typ": check
#import "../core/assets.typ": asset-path
#import "../primitives/media.typ": raw-media
#import "content.typ": scope, heading-block, fine-print, space
#let media(cfg, asset-id, width: 100%, height: auto, fit: auto, caption: none, required: true) = {
  if asset-id == none {
    check(not required, "BRAND_ASSET_MISSING", "media", "required media is omitted")
    return []
  }
  let fit = if fit == auto { cfg.tokens.media.default_fit } else { fit }
  check(fit in ("contain", "cover"), "BRAND_INVALID_VALUE", "media.fit", "expected contain or cover")
  scope(cfg, raw-media(asset-path(cfg.assets, asset-id), width: width, height: height, fit: fit, caption: caption, caption-size: cfg.tokens.media.caption_size, caption-color: cfg.tokens.media.caption_color))
}
#let hero(cfg, asset-id, title: none, subtitle: none, height: 180pt, required: true) = {
  // Keep title in flow: this is also the fallback for arbitrarily long titles.
  media(cfg, asset-id, height: height, fit: "cover", required: required)
  v(space(cfg, multiplier: 0.5))
  heading-block(cfg, title)
  if subtitle != none { fine-print(cfg, subtitle) }
}
#let masthead(cfg, title: none, subtitle: none, value: none) = {
  scope(cfg, grid(columns: if value == none { (1fr,) } else { (1fr, auto) }, gutter: space(cfg), align: top,
    [
      #heading-block(cfg, title)
      #if subtitle != none { fine-print(cfg, subtitle) }
    ],
    ..if value == none { () } else { (text(size: cfg.tokens.type.metric, weight: "bold", fill: cfg.tokens.colors.primary, value),) },
  ))
}
