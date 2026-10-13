#import "../brand/src/lib.typ": define-template
#import "common.typ": common-fields, text-field, body
#let template = define-template(
 id: "yessyfy/warranty", version: "0.0.1",
 schema: (kind: "object", fields: common-fields + (certificate: text-field, starts_at: (kind: "date", required: true), ends_at: (kind: "date", required: true), terms: text-field)),
 render: (kit, data, ctx) => body(kit, data, "warranty"),
)
