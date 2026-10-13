#import "errors.typ": check
#import "schema.typ": validate-data, bind-assets
#import "metadata.typ": validate-meta, validate-options
#let render-document(template: none, data: none, brand: none, meta: (:), options: (:), body) = {
  check(type(template) == dictionary and template.at("__brand_template", default: false), "BRAND_INVALID_TEMPLATE", "template", "use define-template")
  check(type(brand) == dictionary and brand.at("__brand_kit", default: false), "BRAND_INVALID_VALUE", "brand", "use make-brand")
  let meta = validate-meta(meta)
  let options = validate-options(options)
  let data = validate-data(data, template.schema)
  bind-assets(data, template.schema, brand.assets)
  let ctx = (meta: meta, options: options)
  if template.validate != none { let result = (template.validate)(data, ctx); check(result == none, "BRAND_INVALID_TEMPLATE", "template.validate", "validation hook must return none") }
  let output = (template.render)(brand, data, ctx)
  check(type(output) in (str, content), "BRAND_INVALID_TEMPLATE", "template.render", "renderer must return content")
  (brand.document)(meta: meta, header: options.at("header", default: auto), footer: options.at("footer", default: auto), [#output #body])
}
