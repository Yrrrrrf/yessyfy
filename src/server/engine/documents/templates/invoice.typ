#import "../brand/src/lib.typ": define-template
#import "common.typ": common-fields, text-field, body
#let template = define-template(
 id: "yessyfy/invoice", version: "0.0.1",
 schema: (kind: "object", fields: common-fields + (uuid: text-field, stamped_at: text-field, issuer_rfc: text-field, recipient_rfc: text-field, cfdi_type: text-field)),
 render: (kit, data, ctx) => body(kit, data, "invoice"),
)
