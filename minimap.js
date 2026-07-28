// minimap.js
import { state, viewport, LINE_HEIGHT, VIEWPORT_HEIGHT } from './state.js';

const canvas = document.getElementById('minimapCanvas');
const ctx = canvas.getContext('2d');

export function drawMinimap() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const totalLines = state.globalLineOffsets.length - 1;
  if (totalLines <= 0) return;

  // 1. Loading Track Progress Bar
  if (!state.isIndexingComplete) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const progressHeight = (state.indexingProgressPercentage / 100) * canvas.height;
    ctx.fillStyle = '#0e639c';
    ctx.fillRect(canvas.width - 4, 0, 4, progressHeight);
  }

  // 2. Render Search Results
  if (state.searchMatches.length > 0) {
    for (let i = 0; i < state.searchMatches.length; i++) {
      const yPosition = Math.floor((state.searchMatches[i] / totalLines) * canvas.height);

      if (i === state.currentMatchSelectedIndex) {
        ctx.fillStyle = '#ff9d00'; // Active tracking block
        ctx.fillRect(0, yPosition - 1, canvas.width, 3);
      } else {
        ctx.fillStyle = 'rgba(255, 46, 68, 0.8)'; // Regular tick mark
        ctx.fillRect(0, yPosition, canvas.width - 5, 1);
      }
    }
  }

  // 3. Render Viewport Box Bracket Overlay Layer
  const scrollTop = viewport.scrollTop;
  const totalScrollableLines = state.isFilterMode ? state.searchMatches.length : totalLines;

  if (totalScrollableLines > 0) {
    const startLineVisible = scrollTop / LINE_HEIGHT;
    const linesCountInView = VIEWPORT_HEIGHT / LINE_HEIGHT;

    const overlayTopY = (startLineVisible / totalScrollableLines) * canvas.height;
    const overlayHeight = (linesCountInView / totalScrollableLines) * canvas.height;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.fillRect(0, overlayTopY, canvas.width, overlayHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.strokeRect(0, overlayTopY, canvas.width, overlayHeight);
  }
}

export function initMinimapClick() {
  canvas.addEventListener('click', (e) => {
    if (!state.globalLineOffsets || state.globalLineOffsets.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const percentage = (e.clientY - rect.top) / rect.height;
    const totalLines = state.isFilterMode ? state.searchMatches.length : (state.globalLineOffsets.length - 1);

    const targetLine = Math.floor(percentage * totalLines);
    viewport.scrollTop = targetLine * LINE_HEIGHT;
  });
}
