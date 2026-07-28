// main.js
import { state, indexerWorker } from './state.js';

let tailIntervalId = null;
let currentFileHandle = null;

export function startTailingLoop(fileHandle) {
  currentFileHandle = fileHandle;
  const tailCheckbox = document.getElementById('tailModeCheckbox');

  tailCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      tailIntervalId = setInterval(checkForFileGrowth, 500);
    } else {
      stopTailingLoop();
    }
  });
}

export function stopTailingLoop() {
  if (tailIntervalId) {
    clearInterval(tailIntervalId);
    tailIntervalId = null;
  }
}

async function checkForFileGrowth() {
  if (!currentFileHandle || !state.targetFile) return;
  const freshFileSnapshot = await currentFileHandle.getFile();

  if (freshFileSnapshot.size > state.targetFile.size) {
    const newBytesBlob = freshFileSnapshot.slice(state.targetFile.size, freshFileSnapshot.size);
    const oldSize = state.targetFile.size;

    indexerWorker.postMessage({
      type: 'APPEND_CHUNK',
      blob: newBytesBlob,
      previousSize: oldSize
    });
  }
}
