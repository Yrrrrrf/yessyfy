#import "errors.typ": check, closed, nonempty
#import "schema.typ": validate-data
#import "../utils/formatters.typ": validate-timestamp
#import "../theme/resolver.typ": papers
#let meta-schema = (
  kind: "object", fields: (
    title: (kind: "string", nonempty: true),
    author: (kind: "string"),
    subject: (kind: "string"),
    keywords: (kind: "array", items: (kind: "string")),
    paper: (kind: "string"),
    page_numbers: (kind: "boolean", default: false),
    watermark: (kind: "string", nonempty: true, nullable: true, default: none),
    id: (kind: "string", nonempty: true),
    template_id: (kind: "string", nonempty: true),
    template_version: (kind: "string", nonempty: true),
    locale: (kind: "string"),
    created_at: (kind: "string"),
    generated_by: (kind: "object", fields: (kind: (kind: "string", required: true), id: (kind: "string", required: true, nonempty: true))),
  ),
)
#let validate-meta(meta, serialized: false) = {
  check(type(meta) == dictionary, "BRAND_INVALID_VALUE", "document", "expected object")
  let original-keys = meta.keys()
  let meta = validate-data(meta, meta-schema, path: "document")
  if serialized {
    for key in ("id", "template_id", "template_version", "title", "locale", "created_at", "generated_by", "page_numbers", "watermark") {
      check(key in original-keys, "BRAND_REQUIRED_FIELD", "document." + key, "required field is missing")
    }
  }
  if "locale" in meta { check(meta.locale in ("en", "es"), "BRAND_INVALID_LOCALE", "document.locale", "expected en or es") }
  if "paper" in meta { check(meta.paper in papers, "BRAND_INVALID_VALUE", "document.paper", "unknown paper") }
  if "created_at" in meta { let _ = validate-timestamp(meta.created_at, path: "document.created_at") }
  if "generated_by" in meta { check(meta.generated_by.kind in ("user", "system"), "BRAND_INVALID_VALUE", "document.generated_by.kind", "expected user or system") }
  meta
}
#let validate-options(options) = {
  closed(options, ("header", "footer"), "options")
  for value in options.values() { check(value == auto or value == none or type(value) == content or type(value) == str, "BRAND_INVALID_VALUE", "options", "slots require auto, none or native content") }
  options
}
