#import "errors.typ": check, nonempty, closed
#import "schema.typ": check-schema
#let define-template(id: none, version: none, schema: none, render: none, validate: none) = {
  check(nonempty(id) and nonempty(version), "BRAND_INVALID_TEMPLATE", "template", "nonempty ID and version are required")
  check(type(render) == function and (validate == none or type(validate) == function), "BRAND_INVALID_TEMPLATE", "template.render", "expected trusted functions")
  check-schema(schema)
  check(schema.kind == "object", "BRAND_INVALID_TEMPLATE", "template.schema", "root data must be an object")
  (__brand_template: true, id: id, version: version, schema: schema, render: render, validate: validate)
}
