<script lang="ts">
  interface ShortcutNode {
    token: string;
    name: string;
    count: number;
    category: string;
    recipient: "Cliente" | "Colaborador" | "Ambos";
    templateText: string;
  }

  const CONVERSATIONAL_NODES: ShortcutNode[] = [
    {
      token: "/hi",
      name: "01: Saludo & Menú",
      count: 12,
      category: "Triage",
      recipient: "Cliente",
      templateText:
        "¡Hola! Bienvenido a Yessyfy CDMX 🛡️. ¿Qué servicio para tu hogar necesitas hoy? (1) Plomería, (2) Electricidad, (3) Cerrajería, (4) Jardinería, (5) Albañilería, (6) Mantenimiento.",
    },
    {
      token: "/route",
      name: "02: Selección Oficio",
      count: 8,
      category: "Triage",
      recipient: "Cliente",
      templateText:
        "Excelente. Para asignarte el colaborador técnico adecuado, por favor compártenos tu ubicación o colonia y una breve descripción de la falla.",
    },
    {
      token: "/urgencia",
      name: "03: Urgencia / Cotización",
      count: 6,
      category: "Discovery",
      recipient: "Cliente",
      templateText:
        "Cotización inicial estimada: Normal (1.0x), Mismo Día (1.3x) o Emergencia 24/7 (1.8x). Tus fondos se resguardan en custodia Escrow hasta que revises el trabajo.",
    },
    {
      token: "/confirmacion_ok",
      name: "04: Presupuesto Aceptado",
      count: 5,
      category: "Match",
      recipient: "Cliente",
      templateText:
        "¡Presupuesto confirmado! Hemos bloqueado el monto en custodia Escrow. Estamos buscando al profesional independiente más cercano a tu domicilio.",
    },
    {
      token: "/en_camino",
      name: "05: Colaborador en Ruta",
      count: 4,
      category: "Ejecución",
      recipient: "Cliente",
      templateText:
        "Tu profesional independiente está en camino. Puedes seguir su ruta GPS en vivo en la app. Recuerda cerrar la llave de paso o bajar el interruptor si hay riesgo.",
    },
    {
      token: "/en_proceso",
      name: "06: Llegada & Inicio Trabajo",
      count: 7,
      category: "Ejecución",
      recipient: "Cliente",
      templateText:
        "El colaborador técnico ha llegado al domicilio. Está tomando las fotos de diagnóstico obligatorias antes de iniciar la intervención.",
    },
    {
      token: "/por_terminar",
      name: "07: Pruebas Finales",
      count: 2,
      category: "Ejecución",
      recipient: "Colaborador",
      templateText:
        "Pruebas de calidad en curso. Realiza las pruebas de hermeticidad o voltaje y prepara las fotos del trabajo finalizado para la validación del cliente.",
    },
    {
      token: "/finalizado",
      name: "08: Trabajo Listo (Fotos QA)",
      count: 3,
      category: "QA",
      recipient: "Cliente",
      templateText:
        "El colaborador ha finalizado el trabajo y cargado la evidencia fotográfica con marca de agua y coordenadas GPS. Por favor revisa el resultado en tu app.",
    },
    {
      token: "/validacion_ok",
      name: "09: Cliente Firma Conforme",
      count: 9,
      category: "Validación",
      recipient: "Cliente",
      templateText:
        "¡Gracias por validar el servicio! Tu firma de conformidad ha sido registrada y tu Garantía Formal de 30 Días se encuentra activa.",
    },
    {
      token: "/problema_pendiente",
      name: "10: Disputa / Defecto",
      count: 1,
      category: "Disputa",
      recipient: "Ambos",
      templateText:
        "Hemos registrado tu reporte de garantía. Los fondos en Escrow permanecen congelados mientras el equipo técnico de Yessyfy revisa la evidencia en un plazo menor a 24 horas.",
    },
    {
      token: "/pago",
      name: "11: Dispersión Escrow SPEI",
      count: 14,
      category: "Pago",
      recipient: "Colaborador",
      templateText:
        "Pago liberado exitosamente vía SPEI interbancario a tu cuenta CLABE con retenciones automáticas SAT (LISR 113-A e LIVA 18-J aplicadas).",
    },
    {
      token: "/factura_digital",
      name: "12: Timbrado CFDI 4.0 SAT",
      count: 14,
      category: "Fiscal",
      recipient: "Cliente",
      templateText:
        "Tu factura electrónica CFDI 4.0 con folio fiscal UUID ha sido generada exitosamente y enviada a tu correo.",
    },
    {
      token: "/done",
      name: "13: Emisión Garantía 30 Días",
      count: 14,
      category: "Recompra",
      recipient: "Cliente",
      templateText:
        "Certificado de Garantía Yessyfy #YSF-WAR activo por 30 días naturales. ¡Gracias por confiar en profesionales independientes de calidad!",
    },
  ];

  let selectedShortcut = $state<ShortcutNode | null>(null);
  let copiedToast = $state(false);

  function copyTemplate(text: string) {
    navigator.clipboard?.writeText(text);
    copiedToast = true;
    setTimeout(() => (copiedToast = false), 2500);
  }
</script>

<div class="space-y-6">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h2 class="text-xl font-black text-base-content tracking-tight">
        Árbol Conversacional & Cloud API WhatsApp
      </h2>
      <p class="text-xs text-base-content/70">
        Haz clic en cualquier atajo para previsualizar y disparar la plantilla
        oficial HSM ante Meta.
      </p>
    </div>
    {#if copiedToast}
      <div class="badge badge-success font-bold text-xs p-3">
        ✓ Plantilla copiada al portapapeles
      </div>
    {/if}
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each CONVERSATIONAL_NODES as node}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="p-4 rounded-2xl bg-base-200 border border-base-300 hover:border-primary cursor-pointer transition-all shadow-sm {selectedShortcut?.token ===
        node.token
          ? 'border-primary ring-2 ring-primary'
          : ''}"
        onclick={() => (selectedShortcut = node)}
      >
        <div class="flex items-start justify-between">
          <div>
            <span class="badge badge-accent badge-xs font-mono font-bold"
              >{node.token}</span
            >
            <h4 class="font-bold text-sm text-base-content mt-1">
              {node.name}
            </h4>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] text-base-content/60 uppercase"
                >{node.category}</span
              >
              <span class="text-[10px] badge badge-ghost badge-xs"
                >Para: {node.recipient}</span
              >
            </div>
          </div>
          <span class="text-2xl font-black font-mono text-primary"
            >{node.count}</span
          >
        </div>
      </div>
    {/each}
  </div>

  {#if selectedShortcut}
    <div
      class="card bg-base-200 border-2 border-primary rounded-3xl p-6 space-y-4 shadow-xl"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="badge badge-primary font-mono text-sm font-bold"
            >{selectedShortcut.token}</span
          >
          <h3 class="font-bold text-base text-base-content">
            {selectedShortcut.name}
          </h3>
        </div>
        <span class="text-xs text-base-content/60"
          >Destinatario: <strong>{selectedShortcut.recipient}</strong></span
        >
      </div>

      <div
        class="p-4 rounded-2xl bg-base-100 border border-base-300 font-sans text-sm leading-relaxed text-base-content/90"
      >
        "{selectedShortcut.templateText}"
      </div>

      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="btn btn-outline btn-sm rounded-xl font-bold min-h-[44px]"
          onclick={() => (selectedShortcut = null)}
        >
          Cerrar
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm rounded-xl font-bold min-h-[44px]"
          onclick={() =>
            selectedShortcut && copyTemplate(selectedShortcut.templateText)}
        >
          📋 Disparar / Copiar para WhatsApp
        </button>
      </div>
    </div>
  {/if}
</div>
