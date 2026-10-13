#import "errors.typ": check, closed, nonempty
#import "metadata.typ": validate-meta
#import "assets.typ": validate-assets
#import "kit.typ": make-brand
#import "orchestrator.typ": render-document
#import "../theme/resolver.typ": convert-tokens

#let brand-from-json(brand, locale: "en", assets: (:)) = {
  closed(brand, ("id", "version", "preset", "identity", "tokens"), "brand")
  for key in ("id", "version", "preset", "identity") { check(key in brand, "BRAND_REQUIRED_FIELD", "brand." + key, "required field is missing") }
  check(nonempty(brand.id) and nonempty(brand.version), "BRAND_INVALID_VALUE", "brand", "nonempty ID and version are required")
  check(type(brand.identity) == dictionary and nonempty(brand.identity.at("name", default: "")), "BRAND_REQUIRED_FIELD", "brand.identity.name", "required nonempty identity")
  make-brand(preset: brand.preset, identity: brand.identity, tokens: convert-tokens(brand.at("tokens", default: (:))), locale: locale, assets: assets)
}
#let validate-render(job) = {
  closed(job, ("schema", "brand", "document", "data", "assets"), "render")
  for key in ("schema", "brand", "document", "data", "assets") { check(key in job, "BRAND_REQUIRED_FIELD", key, "required field is missing") }
  check(job.schema == "brand.render/1", "BRAND_UNSUPPORTED_SCHEMA", "schema", "expected brand.render/1")
  let _ = validate-meta(job.document, serialized: true)
  check(type(job.data) == dictionary, "BRAND_INVALID_VALUE", "data", "expected object")
  let _ = brand-from-json(job.brand, locale: job.document.locale, assets: job.assets)
  job
}
#let load-render(path: "/render.json") = validate-render(json(path))
#let render-job(job, template: none, body) = {
  let job = validate-render(job)
  check(type(template) == dictionary and template.at("__brand_template", default: false), "BRAND_INVALID_TEMPLATE", "template", "use define-template")
  check(job.document.template_id == template.id, "BRAND_TEMPLATE_MISMATCH", "document.template_id", "trusted template ID does not match")
  check(job.document.template_version == template.version, "BRAND_TEMPLATE_MISMATCH", "document.template_version", "trusted template version does not match")
  let kit = brand-from-json(job.brand, locale: job.document.locale, assets: job.assets)
  render-document(template: template, data: job.data, brand: kit, meta: job.document, body)
}
#let load-input() = {
  let path = sys.inputs.at("data_file", default: none)
  check(nonempty(path), "BRAND_REQUIRED_INPUT", "data_file", "pass a JSON path explicitly")
  json(path)
}
