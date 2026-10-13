/// Stable error codes and closed-object checks.
#let fail(code, path, message) = panic(code + " at " + path + ": " + message)
#let check(ok, code, path, message) = {
  if not ok { fail(code, path, message) }
}
#let object(value, path) = check(type(value) == dictionary, "BRAND_INVALID_VALUE", path, "expected an object")
#let closed(value, allowed, path, code: "BRAND_UNKNOWN_FIELD") = {
  object(value, path)
  for key in value.keys() {
    check(key in allowed, code, path + "." + key, "unknown field")
  }
}
#let nonempty(value) = type(value) == str and value.trim() != ""
#let finite(value) = (type(value) == int or type(value) == float) and value == value and value != calc.inf and value != -calc.inf
