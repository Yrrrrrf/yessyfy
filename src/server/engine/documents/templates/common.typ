#import "../brand/src/lib.typ": define-template
#let text-field = (kind: "string", required: true)
#let common-fields = (
 code: text-field, date: (kind: "date", required: true), customer: text-field,
 collaborator: text-field, service: text-field, address: text-field,
 description: text-field, status: text-field, total: (kind: "money", required: true),
 order_revision: (kind: "integer", required: true), qa: text-field, customer_review: text-field,
 evidence: (kind: "array", required: true, items: (kind: "object", fields: (
  asset_id: (kind: "asset", required: true), phase: text-field, sha256: text-field, received_at: text-field,
 ))),
)
#let body(kit, data, kind) = {
 let es = kit.locale == "es"
 let status-labels = if es { (pending_triage: "En revisión", dispatched: "Oferta enviada", accepted: "Asignado", in_transit: "En camino", in_progress: "En servicio", pending_quote_approval: "Cotización pendiente", pending_validation: "En validación", validated: "Validado", completed: "Completado", disputed: "En revisión de incidencia", cancelled: "Cancelado") } else { (pending_triage: "Under review", dispatched: "Offer sent", accepted: "Assigned", in_transit: "On the way", in_progress: "Work in progress", pending_quote_approval: "Quote awaiting approval", pending_validation: "Awaiting review", validated: "Validated", completed: "Completed", disputed: "Case under review", cancelled: "Cancelled") }
 let service-labels = if es { (plomeria: "Plomería", electricidad: "Electricidad", cerrajeria: "Cerrajería", jardineria: "Jardinería", mantenimiento_hogar: "Mantenimiento", albanileria: "Albañilería") } else { (plomeria: "Plumbing", electricidad: "Electrical", cerrajeria: "Locksmith", jardineria: "Gardening", mantenimiento_hogar: "Home maintenance", albanileria: "Masonry") }
 let phase-labels = if es { (diagnostic_before: "Diagnóstico inicial", work_progress: "Avance del trabajo", proof_finished: "Resultado final") } else { (diagnostic_before: "Initial diagnosis", work_progress: "Work progress", proof_finished: "Final result") }
 let outcome-labels = if es { (not_ready: "Aún no disponible", pending: "Pendiente", accepted: "Aceptado", rejected: "Rechazado", issue: "Incidencia reportada") } else { (not_ready: "Not ready", pending: "Pending", accepted: "Accepted", rejected: "Rejected", issue: "Issue reported") }
 let title = if kind == "warranty" { if es { "Garantía de servicio" } else { "Service warranty" } } else if kind == "invoice" { if es { "Comprobante fiscal" } else { "Fiscal invoice" } } else { if es { "Reporte de servicio" } else { "Service report" } }
 (kit.letterhead)(title: title, reference: data.code, date: (kit.date)(data.date))
 (kit.facts)((
  (label: if es { "Cliente" } else { "Customer" }, value: data.customer),
  (label: if es { "Colaborador" } else { "Professional" }, value: data.collaborator),
  (label: if es { "Servicio" } else { "Service" }, value: service-labels.at(data.service, default: data.service)),
  (label: if es { "Estado" } else { "Status" }, value: status-labels.at(data.status, default: data.status)),
 ), columns: 2)
 (kit.section)(id: "scope", title: if es { "Trabajo y domicilio" } else { "Work and address" }, level: 2)[
  #(kit.body)(data.description)
  #parbreak()
  #(kit.body)(data.address)
 ]
 (kit.summary)(rows: (), total: (label: if kind == "invoice" { if es { "Total del comprobante" } else { "Document total" } } else { if es { "Total aprobado" } else { "Approved total" } }, value: (kit.money)(data.total)))
 if kind == "report" {
  (kit.note)([#(if es { "Control de calidad" } else { "Quality review" }): #outcome-labels.at(data.qa, default: data.qa) · #(if es { "Cliente" } else { "Customer" }): #outcome-labels.at(data.customer_review, default: data.customer_review)], title: if es { "Resultados independientes" } else { "Independent outcomes" })
  (kit.note)(if es { "Este reporte documenta el trabajo y la evidencia recibida. No acredita por sí mismo una transferencia de dinero." } else { "This report records the work and received evidence. It does not by itself confirm a money transfer." })
 }
 if kind == "warranty" {
  (kit.section)(id: "coverage", title: if es { "Cobertura" } else { "Coverage" }, level: 2)[
   #(kit.body)(data.terms)
  ]
  (kit.facts)((
   (label: if es { "Certificado" } else { "Certificate" }, value: data.certificate),
   (label: if es { "Vigencia" } else { "Validity" }, value: (kit.date)(data.starts_at) + " — " + (kit.date)(data.ends_at)),
  ), columns: 2)
 }
 if kind == "invoice" {
  (kit.section)(id: "fiscal", title: "CFDI", level: 2)[
   #(kit.body)("UUID: " + data.uuid)
   #parbreak()
   #(kit.body)("RFC emisor: " + data.issuer_rfc)
   #parbreak()
   #(kit.body)("RFC receptor: " + data.recipient_rfc)
   #parbreak()
   #(kit.body)(if data.cfdi_type == "ingreso_comision" { if es { "Comisión de la plataforma" } else { "Platform commission" } } else { if es { "Constancia de retenciones" } else { "Withholding statement" } })
   #parbreak()
   #(kit.body)(data.stamped_at)
  ]
  (kit.note)(if es { "Representación del comprobante confirmado por el proveedor fiscal. El XML autorizado se conserva con este documento." } else { "Representation of the fiscal document confirmed by the provider. The authorized XML is retained with this document." })
 }
 if data.evidence.len() > 0 {
  (kit.section)(id: "evidence", title: if es { "Evidencia recibida" } else { "Received evidence" }, level: 2)[]
  for e in data.evidence {
   block(breakable: false)[
    #(kit.media)(e.asset_id, height: 40mm, fit: "contain", caption: phase-labels.at(e.phase, default: e.phase))
    #parbreak()
    #(kit.body)("SHA-256: " + e.sha256)
    #parbreak()
    #(kit.body)(e.received_at)
   ]
   v(8pt)
  }
 }
}
