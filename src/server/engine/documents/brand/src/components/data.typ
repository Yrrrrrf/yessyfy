#import "../core/errors.typ": check, closed, finite
#import "../core/resolve.typ": walk
#import "../utils/formatters.typ": format-money, format-date, format-percent
#import "../primitives/data-table.typ": raw-data-table
#import "content.typ": scope, space

#let cell(cfg, value, kind, path) = {
  if value == none { return [] }
  if kind == "money" { return format-money(value) }
  if kind == "date" { return format-date(value, locale: cfg.locale) }
  if kind == "percent" { return format-percent(value) }
  if kind == "boolean" {
    check(type(value) == bool, "BRAND_INVALID_TABLE", path, "expected boolean")
    return if value { cfg.strings.yes } else { cfg.strings.no }
  }
  if kind == "number" {
    check(finite(value), "BRAND_INVALID_TABLE", path, "expected nonfinancial number")
    return str(value)
  }
  check(type(value) in (str, content), "BRAND_INVALID_TABLE", path, "expected literal text; dictionaries are not cells")
  value
}
#let data-table(cfg, columns: none, rows: none, empty: "omit", empty-text: none) = {
  check(type(columns) == array and columns.len() > 0 and type(rows) == array, "BRAND_INVALID_TABLE", "table", "expected columns and record rows")
  check(empty in ("omit", "message", "error"), "BRAND_INVALID_TABLE", "table.empty", "unknown empty policy")
  for (i, col) in columns.enumerate() {
    let path = "table.columns[" + str(i) + "]"
    closed(col, ("path", "label", "kind", "width", "align", "required", "render"), path)
    check("path" in col and "label" in col and "kind" in col, "BRAND_INVALID_TABLE", path, "path, label and kind are required")
    check(type(col.path) == array and col.path.len() > 0 and col.path.all(x => type(x) == str and x != ""), "BRAND_INVALID_TABLE", path + ".path", "expected nonempty key array")
    check(col.kind in ("text", "number", "money", "date", "percent", "boolean"), "BRAND_INVALID_TABLE", path + ".kind", "unknown cell kind")
    check(type(col.label) in (str, content), "BRAND_INVALID_TABLE", path + ".label", "expected literal text or native content")
    if "width" in col { check(col.width == auto or type(col.width) in (length, ratio, relative, type(1fr)), "BRAND_INVALID_TABLE", path + ".width", "expected native track size") }
    if "align" in col { check(col.align == auto or type(col.align) == type(left), "BRAND_INVALID_TABLE", path + ".align", "expected native alignment") }
    if "render" in col { check(type(col.render) == function, "BRAND_INVALID_TABLE", path + ".render", "expected trusted function") }
    if "required" in col { check(type(col.required) == bool, "BRAND_INVALID_TABLE", path + ".required", "expected boolean") }
  }
  if rows.len() == 0 {
    check(empty != "error", "BRAND_EMPTY_TABLE", "table.rows", "rows must not be empty")
    if empty == "message" {
      check(empty-text != none, "BRAND_INVALID_TABLE", "table.empty-text", "explicit message is required")
      return scope(cfg, empty-text)
    }
    return []
  }
  let output = rows.enumerate().map(((i, row)) => {
    check(type(row) == dictionary, "BRAND_INVALID_TABLE", "table.rows[" + str(i) + "]", "expected record")
    columns.map(col => {
      let value = walk(row, col.path, path: "table.rows[" + str(i) + "]", required: col.at("required", default: true))
      check(value != none or not col.at("required", default: true), "BRAND_INVALID_TABLE", "table.rows[" + str(i) + "]." + col.path.join("."), "required cell is null")
      if "render" in col { (col.render)(value, row) } else { cell(cfg, value, col.kind, "table.rows[" + str(i) + "]." + col.path.join(".")) }
    })
  })
  scope(cfg, raw-data-table(
    columns: columns.map(col => col.at("width", default: if col.kind == "text" { 1fr } else { auto })),
    headers: columns.map(col => col.label), rows: output,
    aligns: columns.map(col => col.at("align", default: if col.kind in ("number", "money", "percent") { right } else { left })),
    header-fill: cfg.tokens.table.header_background, header-text: cfg.tokens.table.header_foreground,
    alternate: cfg.tokens.table.alternate_background, border: cfg.tokens.colors.border,
    padding: cfg.tokens.table.cell_padding, small: cfg.tokens.type.small,
  ))
}
#let summary(cfg, rows: none, total: none) = {
  check(type(rows) == array, "BRAND_INVALID_VALUE", "summary.rows", "expected ordered rows")
  let all = if total != none { rows + (total,) } else { rows }
  for row in all {
    closed(row, ("label", "value"), "summary.row")
    check("label" in row and "value" in row and type(row.value) in (str, content), "BRAND_INVALID_VALUE", "summary.row", "expected literal/content label and value")
  }
  scope(cfg, align(right, block(width: 75%, breakable: false)[
    #for row in rows {
      grid(columns: (1fr, auto), gutter: space(cfg), row.label, row.value)
      v(4pt)
    }
    #if total != none {
      v(6pt)
      line(length: 100%, stroke: cfg.tokens.shapes.normal_stroke + cfg.tokens.colors.primary)
      v(6pt)
      grid(columns: (1fr, auto), gutter: space(cfg),
        text(weight: "bold", total.label), text(weight: "bold", fill: cfg.tokens.colors.primary, total.value))
    }
  ]))
}
