<script lang="ts">
interface Props {
  scheduleMode: 'inmediata' | 'programada';
  scheduleDate: string;
  scheduleTimeSlot: string;
  onModeChange: (mode: 'inmediata' | 'programada') => void;
  onDateChange: (d: string) => void;
  onTimeChange: (t: string) => void;
}

let { scheduleMode, scheduleDate, scheduleTimeSlot, onModeChange, onDateChange, onTimeChange }: Props = $props();

const dtf = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
const availableDates = Array.from({ length: 7 }, (_, i) => {
  if (i === 0) return { label: 'Hoy', value: 'Hoy' };
  if (i === 1) return { label: 'Mañana', value: 'Mañana' };
  const d = new Date();
  d.setDate(d.getDate() + i);
  const formatted = dtf.format(d);
  return {
    label: formatted.charAt(0).toUpperCase() + formatted.slice(1),
    value: formatted,
  };
});
</script>

<div>
  <div class="block text-xs font-bold uppercase tracking-wider text-base-content/60 mb-2">4. ¿Cuándo lo necesitas?</div>
  <div class="join w-full grid grid-cols-2 mb-2">
    <button
      type="button"
      class="join-item btn btn-sm {scheduleMode === 'inmediata' ? 'btn-primary' : 'btn-outline'}"
      onclick={() => onModeChange('inmediata')}
    >
      ⚡ Inmediato (30-45m)
    </button>
    <button
      type="button"
      class="join-item btn btn-sm {scheduleMode === 'programada' ? 'btn-primary' : 'btn-outline'}"
      onclick={() => onModeChange('programada')}
    >
      📅 Programar Cita
    </button>
  </div>

  {#if scheduleMode === 'programada'}
    <div class="grid grid-cols-2 gap-2 pt-1">
      <div>
        <label for="schedule-date-select" class="text-[10px] text-base-content/60 block mb-1">Día</label>
        <select
          id="schedule-date-select"
          value={scheduleDate}
          onchange={(e) => onDateChange(e.currentTarget.value)}
          class="select select-xs w-full"
        >
          {#each availableDates as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="schedule-time-select" class="text-[10px] text-base-content/60 block mb-1">Horario (Ventana 2h)</label>
        <select
          id="schedule-time-select"
          value={scheduleTimeSlot}
          onchange={(e) => onTimeChange(e.currentTarget.value)}
          class="select select-xs w-full"
        >
          <option value="09:00 - 11:00">09:00 - 11:00</option>
          <option value="11:00 - 13:00">11:00 - 13:00</option>
          <option value="14:00 - 16:00">14:00 - 16:00</option>
          <option value="16:00 - 18:00">16:00 - 18:00</option>
        </select>
      </div>
    </div>
  {/if}
</div>



