#import "errors.typ": check, closed, object, nonempty, finite, fail
#import "../utils/formatters.typ": validate-money, validate-date, validate-percent

#let kinds = ("object", "array", "string", "integer", "number", "boolean", "money", "date", "percent", "asset")
#let validate-data(value, schema, path: "data") = {
  if value == none {
    check(schema.at("nullable", default: false), "BRAND_INVALID_VALUE", path, "null is not allowed")
    return none
  }
  let kind = schema.kind
  if kind == "object" {
    object(value, path)
    if not schema.at("allow_unknown", default: false) { closed(value, schema.fields.keys(), path) }
    let result = if schema.at("allow_unknown", default: false) { value } else { (:) }
    for (key, descriptor) in schema.fields {
      if key in value {
        result.insert(key, validate-data(value.at(key), descriptor, path: path + "." + key))
      } else if "default" in descriptor {
        result.insert(key, validate-data(descriptor.default, descriptor, path: path + "." + key))
      } else {
        check(not descriptor.at("required", default: false), "BRAND_REQUIRED_FIELD", path + "." + key, "required field is missing")
      }
    }
    if schema.at("nonempty", default: false) { check(value.len() > 0, "BRAND_INVALID_VALUE", path, "must not be empty") }
    return result
  }
  if kind == "array" {
    check(type(value) == array, "BRAND_INVALID_VALUE", path, "expected array")
    if schema.at("nonempty", default: false) { check(value.len() > 0, "BRAND_INVALID_VALUE", path, "must not be empty") }
    return value.enumerate().map(((i, item)) => validate-data(item, schema.items, path: path + "[" + str(i) + "]"))
  }
  if kind == "string" {
    check(type(value) == str, "BRAND_INVALID_VALUE", path, "expected string")
    if schema.at("nonempty", default: false) { check(nonempty(value), "BRAND_INVALID_VALUE", path, "must not be empty") }
  } else if kind == "integer" {
    check(type(value) == int, "BRAND_INVALID_VALUE", path, "expected integer")
  } else if kind == "number" {
    check(finite(value), "BRAND_INVALID_VALUE", path, "expected finite nonfinancial number")
  } else if kind == "boolean" {
    check(type(value) == bool, "BRAND_INVALID_VALUE", path, "expected boolean")
  } else if kind == "money" {
    let _ = validate-money(value, path: path)
  } else if kind == "date" {
    let _ = validate-date(value, path: path)
  } else if kind == "percent" {
    let _ = validate-percent(value, path: path)
  } else if kind == "asset" {
    check(type(value) == str and value.match(regex("^[A-Za-z0-9][A-Za-z0-9_-]*$")) != none, "BRAND_INVALID_ASSET", path, "expected logical asset ID")
  }
  value
}
#let check-schema(schema, path: "schema") = {
  closed(schema, ("kind", "required", "nullable", "default", "fields", "items", "nonempty", "allow_unknown"), path, code: "BRAND_INVALID_SCHEMA")
  check("kind" in schema and schema.kind in kinds, "BRAND_INVALID_SCHEMA", path + ".kind", "unknown or absent kind")
  for key in ("required", "nullable", "nonempty", "allow_unknown") {
    if key in schema { check(type(schema.at(key)) == bool, "BRAND_INVALID_SCHEMA", path + "." + key, "expected boolean") }
  }
  if "nonempty" in schema { check(schema.kind in ("object", "array", "string"), "BRAND_INVALID_SCHEMA", path, "nonempty is only for objects, arrays and strings") }
  if "allow_unknown" in schema { check(schema.kind == "object", "BRAND_INVALID_SCHEMA", path, "allow_unknown requires object") }
  if schema.kind == "object" {
    check("fields" in schema, "BRAND_INVALID_SCHEMA", path + ".fields", "fields are required")
    object(schema.fields, path + ".fields")
    for (key, descriptor) in schema.fields { check-schema(descriptor, path: path + "." + key) }
  } else { check("fields" not in schema, "BRAND_INVALID_SCHEMA", path, "fields requires object") }
  if schema.kind == "array" {
    check("items" in schema, "BRAND_INVALID_SCHEMA", path + ".items", "items are required")
    check-schema(schema.items, path: path + "[]")
  } else { check("items" not in schema, "BRAND_INVALID_SCHEMA", path, "items requires array") }
  if "default" in schema {
    check(not schema.at("required", default: false), "BRAND_INVALID_SCHEMA", path, "required fields cannot declare defaults")
    let _ = validate-data(schema.default, schema, path: path + ".default")
  }
  none
}
#let bind-assets(value, schema, assets, path: "data") = {
  if value == none { return }
  if schema.kind == "asset" { check(value in assets, "BRAND_ASSET_MISSING", path, "logical asset is not staged") }
  if schema.kind == "object" {
    for (key, descriptor) in schema.fields {
      if key in value { bind-assets(value.at(key), descriptor, assets, path: path + "." + key) }
    }
  }
  if schema.kind == "array" {
    for (i, item) in value.enumerate() { bind-assets(item, schema.items, assets, path: path + "[" + str(i) + "]") }
  }
}
