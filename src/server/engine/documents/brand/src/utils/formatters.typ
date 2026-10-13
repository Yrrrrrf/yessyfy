#import "../core/errors.typ": check, closed

#let validate-money(value, path: "money") = {
  closed(value, ("amount", "currency"), path)
  check("amount" in value and "currency" in value, "BRAND_INVALID_MONEY", path, "amount and currency are required")
  check(type(value.amount) == str, "BRAND_INVALID_MONEY", path + ".amount", "expected canonical decimal text")
  check(value.amount.match(regex("^-?(0|[1-9][0-9]*)\\.[0-9]{2}$")) != none and value.amount != "-0.00", "BRAND_INVALID_MONEY", path + ".amount", "expected canonical decimal text with two fractional digits")
  check(value.currency in ("MXN", "USD", "EUR", "GBP", "CAD"), "BRAND_INVALID_MONEY", path + ".currency", "unsupported currency")
  value
}
#let format-money(value) = {
  let value = validate-money(value)
  let parts = value.amount.split(".")
  let digits = parts.first()
  let sign = if digits.starts-with("-") { "-" } else { "" }
  if sign != "" { digits = digits.slice(1) }
  let grouped = ""
  for (index, ch) in digits.clusters().enumerate() {
    if index > 0 and calc.rem(digits.len() - index, 3) == 0 { grouped += "," }
    grouped += ch
  }
  value.currency + " " + sign + grouped + "." + parts.last()
}
#let validate-date(value, path: "date") = {
  check(type(value) == str, "BRAND_INVALID_DATE", path, "expected YYYY-MM-DD")
  check(value.match(regex("^[0-9]{4}-[0-9]{2}-[0-9]{2}$")) != none, "BRAND_INVALID_DATE", path, "expected YYYY-MM-DD")
  let parts = value.split("-").map(int)
  let (year, month, day) = parts
  check(year >= 1 and month >= 1 and month <= 12, "BRAND_INVALID_DATE", path, "invalid calendar date")
  let leap = calc.rem(year, 400) == 0 or (calc.rem(year, 4) == 0 and calc.rem(year, 100) != 0)
  let days = (31, if leap { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
  check(day >= 1 and day <= days.at(month - 1), "BRAND_INVALID_DATE", path, "invalid calendar date")
  datetime(year: year, month: month, day: day)
}
#let format-date(value, locale: "en") = {
  let date = validate-date(value)
  check(locale in ("en", "es"), "BRAND_INVALID_LOCALE", "locale", "expected en or es")
  let parts = value.split("-")
  let months = if locale == "en" {
    ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
  } else {
    ("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")
  }
  let month = months.at(int(parts.at(1)) - 1)
  if locale == "en" { month + " " + str(int(parts.last())) + ", " + parts.first() }
  else { str(int(parts.last())) + " " + month + " " + parts.first() }
}
#let validate-percent(value, path: "percent") = {
  check(type(value) == str, "BRAND_INVALID_PERCENT", path, "expected expressed-percentage decimal text")
  check(value.match(regex("^-?(0|[1-9][0-9]*)(\\.[0-9]{1,6})?$")) != none, "BRAND_INVALID_PERCENT", path, "expected expressed-percentage decimal text")
  value
}
#let format-percent(value) = validate-percent(value) + "%"
#let validate-timestamp(value, path: "created_at") = {
  check(type(value) == str, "BRAND_INVALID_DATE", path, "expected UTC YYYY-MM-DDTHH:MM:SSZ")
  check(value.match(regex("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$")) != none, "BRAND_INVALID_DATE", path, "expected UTC YYYY-MM-DDTHH:MM:SSZ")
  let date = validate-date(value.slice(0, 10), path: path)
  let time = value.slice(11, 19).split(":").map(int)
  check(time.at(0) <= 23 and time.at(1) <= 59 and time.at(2) <= 59, "BRAND_INVALID_DATE", path, "invalid UTC time")
  datetime(year: date.year(), month: date.month(), day: date.day(), hour: time.at(0), minute: time.at(1), second: time.at(2))
}
