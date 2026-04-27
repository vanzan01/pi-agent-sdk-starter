const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Share+Tech+Mono&display=swap';

const STYLE_ID = 'synth-styles';

const THEME_STYLES = `
    :root {
      --void: #0a0612;
      --void-light: #120a1e;
      --surface: #1a0f2e;
      --surface-glow: #251448;
      --neon-pink: #ff2d95;
      --neon-pink-dim: #cc2477;
      --neon-cyan: #00f0ff;
      --neon-cyan-dim: #00b8c4;
      --neon-purple: #b24dff;
      --chrome: linear-gradient(180deg, #e8e8e8 0%, #a0a0a0 50%, #e8e8e8 100%);
      --text: #f0e6ff;
      --text-dim: #8b7aa8;
      --font-display: 'Orbitron', 'Segoe UI', sans-serif;
      --font-mono: 'Share Tech Mono', 'Consolas', monospace;
    }
    .synth-grid {
      background-image:
        linear-gradient(rgba(255, 45, 149, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 45, 149, 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
    }
    .synth-glow-pink {
      box-shadow: 0 0 20px rgba(255, 45, 149, 0.3), 0 0 40px rgba(255, 45, 149, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    .synth-glow-cyan {
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.3), 0 0 40px rgba(0, 240, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    .synth-glow-purple {
      box-shadow: 0 0 20px rgba(178, 77, 255, 0.3), 0 0 40px rgba(178, 77, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    .synth-text-glow {
      text-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor;
    }
    .synth-scanlines::after {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 0, 0, 0.15) 2px,
        rgba(0, 0, 0, 0.15) 4px
      );
      pointer-events: none;
      z-index: 100;
    }
    @keyframes neonPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    @keyframes dataStream {
      0% { background-position: 0% 0%; }
      100% { background-position: 0% 100%; }
    }
    @keyframes glitch {
      0%, 90%, 100% { transform: translate(0); }
      92% { transform: translate(-2px, 1px); }
      94% { transform: translate(2px, -1px); }
      96% { transform: translate(-1px, 2px); }
      98% { transform: translate(1px, -2px); }
    }
    .synth-pulse {
      animation: neonPulse 2s ease-in-out infinite;
    }
    .synth-card {
      background: linear-gradient(135deg, var(--surface) 0%, var(--void-light) 100%);
      border: 1px solid rgba(255, 45, 149, 0.2);
      backdrop-filter: blur(10px);
    }
    .synth-card-cyan {
      border-color: rgba(0, 240, 255, 0.3);
    }
    .synth-card-purple {
      border-color: rgba(178, 77, 255, 0.3);
    }
    .synth-button {
      background: linear-gradient(135deg, var(--neon-pink) 0%, var(--neon-purple) 100%);
      font-family: var(--font-display);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      transition: all 0.2s ease;
    }
    .synth-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 0 30px rgba(255, 45, 149, 0.5), 0 0 60px rgba(255, 45, 149, 0.2);
    }
    .synth-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .synth-input {
      background: rgba(10, 6, 18, 0.8);
      border: 1px solid rgba(255, 45, 149, 0.3);
      font-family: var(--font-mono);
    }
    .synth-badge {
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 10px;
    }
  `;

export function ensureSynthTheme() {
  const fontLink = document.createElement('link');
  fontLink.href = FONT_HREF;
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = THEME_STYLES;
    document.head.appendChild(style);
  }
}
