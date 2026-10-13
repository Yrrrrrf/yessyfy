#import "en.typ" as en
#import "es.typ" as es
#import "../core/errors.typ": check, closed, object
#let catalogs = (en: en.strings, es: es.strings)
#let parity(catalog) = {
  closed(catalog, ("en", "es"), "catalog")
  check("en" in catalog and "es" in catalog, "BRAND_I18N_PARITY", "catalog", "both en and es catalogs are required")
  object(catalog.en, "catalog.en")
  object(catalog.es, "catalog.es")
  check(catalog.en.keys().sorted() == catalog.es.keys().sorted(), "BRAND_I18N_PARITY", "catalog", "catalog key sets differ")
  for language in ("en", "es") {
    check(catalog.at(language).values().all(v => type(v) == str), "BRAND_INVALID_VALUE", "catalog." + language, "catalog values must be strings")
  }
}
#parity(catalogs)
#let resolve-catalog(locale, extra: (:)) = {
  check(locale in ("en", "es"), "BRAND_INVALID_LOCALE", "locale", "expected en or es")
  object(extra, "catalog")
  let resolved = catalogs.at(locale)
  if extra.len() > 0 {
    parity(extra)
    for (key, value) in extra.at(locale) { resolved.insert(key, value) }
  }
  resolved
}
#let translate(strings, key) = {
  check(key in strings, "BRAND_I18N_KEY", "catalog." + key, "unknown translation key")
  strings.at(key)
}
