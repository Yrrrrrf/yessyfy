<script lang="ts">
interface Props {
  jobCode: string;
  stampedUuid: string;
  rfc: string;
  totalCents: number;
}

let { jobCode, stampedUuid, rfc, totalCents }: Props = $props();

function downloadMockFile(ext: 'pdf' | 'xml') {
  const content = ext === 'xml'
    ? `<?xml version="1.0" encoding="UTF-8"?><cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Folio="${jobCode}" Total="${(totalCents / 100).toFixed(2)}" UUID="${stampedUuid}"></cfdi:Comprobante>`
    : `YESSYFY CFDI 4.0 PDF - FOLIO ${jobCode} - UUID ${stampedUuid} - RFC ${rfc}`;
  const blob = new Blob([content], { type: ext === 'xml' ? 'application/xml' : 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `factura_${jobCode}_${rfc}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<div class="grid grid-cols-2 gap-3 pt-2">
  <button
    type="button"
    class="btn btn-neutral btn-sm rounded-xl font-bold min-h-[48px]"
    onclick={() => downloadMockFile('xml')}
  >
    💾 Descargar XML
  </button>
  <button
    type="button"
    class="btn btn-primary btn-sm rounded-xl font-bold min-h-[48px]"
    onclick={() => downloadMockFile('pdf')}
  >
    📄 Descargar PDF
  </button>
</div>
