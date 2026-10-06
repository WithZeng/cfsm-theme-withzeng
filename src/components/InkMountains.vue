<template>
  <svg class="mountains" viewBox="0 0 1440 360" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
    <defs>
      <filter id="jl-ink-bg">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="3" seed="9" />
        <feDisplacementMap in="SourceGraphic" scale="14" />
      </filter>
      <linearGradient id="jl-fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.6" stop-color="#fff" stop-opacity="1" />
        <stop offset="1" stop-color="#fff" stop-opacity="0" />
      </linearGradient>
      <mask id="jl-fade-mask"><rect width="1440" height="360" fill="url(#jl-fade)" /></mask>
    </defs>
    <path
      mask="url(#jl-fade-mask)"
      filter="url(#jl-ink-bg)"
      d="M0 250 C90 200 150 130 220 124 C290 118 320 200 400 196 C480 192 520 90 600 80 C680 70 720 190 800 196 C880 202 930 120 1010 110 C1090 100 1130 180 1210 186 C1290 192 1360 140 1440 132 L1440 360 L0 360 Z"
    />
  </svg>
</template>

<style scoped>
.mountains {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 360px;
  pointer-events: none;
  z-index: 0;
}
.mountains path {
  fill: var(--mount);
  opacity: var(--mount-op);
}
</style>
