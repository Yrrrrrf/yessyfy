#import "../components/content.typ" as c
#import "../components/data.typ" as d
#import "../components/identity.typ" as i
#import "../components/media.typ" as m
#import "../utils/formatters.typ": format-money, format-date, format-percent
#import "../i18n/i18n.typ": translate
#import "../core/document.typ": document-wrap, page-zone, page-numbers

#let bind-ui(cfg) = (
  document: document-wrap.with(cfg),
  page: page-zone.with(cfg), page-numbers: page-numbers.with(cfg),
  heading: c.heading-block.with(cfg), section: c.section.with(cfg),
  body: c.body-text.with(cfg), fine-print: c.fine-print.with(cfg),
  card: c.card.with(cfg), badge: c.badge.with(cfg), metric: c.metric.with(cfg),
  facts: c.facts.with(cfg), note: c.note.with(cfg), space: c.space.with(cfg),
  data-table: d.data-table.with(cfg), summary: d.summary.with(cfg),
  party: i.party.with(cfg), party-grid: i.party-grid.with(cfg),
  contact: i.contact.with(cfg), signature: i.signature.with(cfg),
  letterhead: i.letterhead.with(cfg), cover: i.cover.with(cfg),
  media: m.media.with(cfg), hero: m.hero.with(cfg), masthead: m.masthead.with(cfg),
  money: format-money, date: format-date.with(locale: cfg.locale),
  percent: format-percent, t: translate.with(cfg.strings),
)
