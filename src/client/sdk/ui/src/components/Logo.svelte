<script lang="ts">
import logoSrc from '../assets/img/logo.png';

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon' | 'full';
  subtitle?: string;
  badgeText?: string;
  badgeClass?: string;
  alt?: string;
  showText?: boolean;
  class?: string;
}

let {
  size = 'md',
  variant = 'full',
  subtitle,
  badgeText,
  badgeClass = 'badge-primary',
  alt = 'Yessyfy Logo',
  showText = true,
  class: className = '',
}: Props = $props();

const dimensionClass = $derived.by(() => {
  switch (size) {
    case 'xs':
      return 'w-6 h-6';
    case 'sm':
      return 'w-8 h-8';
    case 'md':
      return 'w-10 h-10';
    case 'lg':
      return 'w-12 h-12';
    case 'xl':
      return 'w-16 h-16';
  }
});
</script>

<div class="inline-flex items-center gap-2.5 {className}">
  <!-- Official Yessyfy Logo Icon -->
  <div class="relative shrink-0 {dimensionClass} rounded-2xl overflow-hidden shadow-sm flex items-center justify-center bg-base-100">
    <img
      src={logoSrc}
      alt={alt || 'Yessyfy Logo'}
      aria-label={alt || 'Yessyfy Logo'}
      class="w-full h-full object-contain"
    />
  </div>

  <!-- Text & Subtitle / Badges -->
  {#if showText && variant !== 'icon'}
    <div class="flex flex-col text-left">
      <div class="flex items-center gap-1.5 leading-none">
        <span class="font-black text-lg sm:text-xl tracking-tight text-base-content">Yessyfy</span>
        {#if badgeText}
          <span class="badge {badgeClass} badge-xs font-bold uppercase">{badgeText}</span>
        {/if}
      </div>
      {#if subtitle}
        <span class="text-[10px] text-base-content/60 font-semibold tracking-wide mt-0.5">
          {subtitle}
        </span>
      {/if}
    </div>
  {/if}
</div>



