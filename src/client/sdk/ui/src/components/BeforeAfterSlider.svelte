<script lang="ts">
  let {
    beforeUrl,
    afterUrl,
    beforeLabel = "Antes",
    afterLabel = "Después",
    controlLabel = "Comparar antes y después",
  }: {
    beforeUrl: string;
    afterUrl: string;
    beforeLabel?: string;
    afterLabel?: string;
    controlLabel?: string;
  } = $props();
  let position = $state(50);
</script>

<div class="comparison">
  <img src={afterUrl} alt={afterLabel} loading="lazy" /><img
    class="before"
    src={beforeUrl}
    alt={beforeLabel}
    loading="lazy"
    style:clip-path={`inset(0 ${100 - position}% 0 0)`}
  /><span class="caption before-caption">{beforeLabel}</span><span
    class="caption after-caption">{afterLabel}</span
  >
  <div class="divider" style:left={`${position}%`}>↔</div>
  <label class="control"
    >{controlLabel}<input
      type="range"
      min="0"
      max="100"
      bind:value={position}
      aria-label={controlLabel}
    /></label
  >
</div>

<style>
  .comparison {
    position: relative;
    height: 340px;
    border: 1px solid var(--color-base-300);
    border-radius: 18px;
    overflow: hidden;
    background: var(--color-base-200);
    margin: 16px 0;
  }
  .comparison img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .before {
    position: absolute;
    inset: 0;
    background: var(--color-base-200);
  }
  .caption {
    position: absolute;
    top: 12px;
    background: #10291ee8;
    color: #fff;
    border-radius: 8px;
    padding: 6px 10px;
  }
  .before-caption {
    left: 12px;
  }
  .after-caption {
    right: 12px;
  }
  .divider {
    position: absolute;
    top: 0;
    height: calc(100% - 75px);
    width: 3px;
    background: white;
    color: #10291e;
    display: grid;
    align-items: center;
    pointer-events: none;
  }
  .control {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px 16px;
    background: var(--color-base-100);
    font-size: 13px;
  }
  .control input {
    display: block;
    width: 100%;
    min-height: 34px;
    margin: 0;
  }
</style>
