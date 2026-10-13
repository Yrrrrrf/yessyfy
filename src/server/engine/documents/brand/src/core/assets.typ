#import "errors.typ": check, closed, object
#let validate-assets(assets) = {
  object(assets, "assets")
  for (id, entry) in assets {
    check(id.match(regex("^[A-Za-z0-9][A-Za-z0-9_-]*$")) != none, "BRAND_INVALID_ASSET", "assets." + id, "invalid asset ID")
    closed(entry, ("path", "mime_type"), "assets." + id)
    check("path" in entry and "mime_type" in entry and type(entry.path) == str, "BRAND_INVALID_ASSET", "assets." + id, "path and MIME type are required")
    let path = entry.path
    check(path.starts-with("/assets/") and path.len() > 8 and not path.contains("\\") and not path.contains("\u{0}") and not path.contains(":") and not path.ends-with("/"), "BRAND_INVALID_ASSET", "assets." + id + ".path", "expected root-relative /assets/ file")
    check(path.split("/").slice(1).all(part => part not in ("", ".", "..")), "BRAND_INVALID_ASSET", "assets." + id + ".path", "invalid path segment")
    check(entry.mime_type in ("image/png", "image/jpeg", "image/webp"), "BRAND_INVALID_ASSET", "assets." + id + ".mime_type", "unsupported media type")
  }
  assets
}
#let asset-path(assets, id) = {
  check(type(id) == str and id in assets, "BRAND_ASSET_MISSING", "assets." + str(id), "logical asset is not staged")
  assets.at(id).path
}
