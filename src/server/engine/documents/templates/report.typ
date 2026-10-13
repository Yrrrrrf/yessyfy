#import "../brand/src/lib.typ": define-template
#import "common.typ": common-fields, text-field, body
#let template = define-template(
 id: "yessyfy/report", version: "0.0.1",
 schema: (kind: "object", fields: common-fields + (:)),
 render: (kit, data, ctx) => body(kit, data, "report"),
)
