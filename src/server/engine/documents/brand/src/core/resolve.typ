#import "errors.typ": check, object, closed
#let walk(data, parts, path: "data", required: true) = {
  let value = data
  for key in parts {
    if type(value) != dictionary or key not in value {
      check(not required, "BRAND_REQUIRED_FIELD", path + "." + parts.join("."), "required field is missing")
      return none
    }
    value = value.at(key)
  }
  value
}
#let provided(data, parts) = {
  let value = data
  for key in parts {
    if type(value) != dictionary or key not in value { return false }
    value = value.at(key)
  }
  true
}
#let merge(base, override, path: "brand.tokens") = {
  object(override, path)
  let result = base
  for (key, value) in override {
    check(key in base, "BRAND_UNKNOWN_TOKEN", path + "." + key, "unknown token")
    if type(base.at(key)) == dictionary {
      result.insert(key, merge(base.at(key), value, path: path + "." + key))
    } else {
      result.insert(key, value)
    }
  }
  result
}
