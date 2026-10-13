#import "../core/errors.typ": check
#let raw-data-table(columns: none, headers: none, rows: none, aligns: auto, header-fill: none, header-text: black, alternate: none, border: gray, padding: 8pt, small: 8.5pt) = {
  check((type(columns) == int or type(columns) == array) and type(headers) == array and type(rows) == array, "BRAND_INVALID_TABLE", "table", "expected native tracks, headers and row arrays")
  let count = if type(columns) == int { columns } else { columns.len() }
  check(count > 0 and headers.len() == count, "BRAND_INVALID_TABLE", "table.headers", "header width must match columns")
  for (i, row) in rows.enumerate() {
    check(type(row) == array and row.len() == count, "BRAND_INVALID_TABLE", "table.rows[" + str(i) + "]", "row width must match columns")
    check(row.all(cell => type(cell) != array and type(cell) != dictionary), "BRAND_INVALID_TABLE", "table.rows[" + str(i) + "]", "ambiguous nested cell")
  }
  table(
    columns: columns, align: aligns, inset: padding,
    stroke: (x, y) => (bottom: 0.5pt + border),
    fill: (x, y) => if y == 0 { header-fill } else if calc.odd(y) { alternate } else { none },
    table.header(repeat: true, ..headers.map(h => text(fill: header-text, size: small, weight: "bold", h))),
    ..rows.fold((), (cells, row) => cells + row),
  )
}
