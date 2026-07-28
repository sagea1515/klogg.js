export const state = { /* state.js */
  targetFile: null,
  globalLineOffsets: [],
  searchMatches: [],
  isFilterMode: false,
  currentSearchQuery: "",
  currentMatchSelectedIndex: -1,
  indexingProgressPercentage: 0,
  isIndexingComplete: false
}

export const LINE_HEIGHT = 20 /* UI Layout Constants */
export const VIEWPORT_HEIGHT = 500
export const BUFFER_LINES = 5

export const viewport = document.getElementById('scrollViewport') /* DOM Viewport Cache */
export const phantom = document.getElementById('scrollPhantom')
export const container = document.getElementById('visibleLinesContainer')

export const indexerWorker = new Worker(new URL('./indexer.worker.js', import.meta.url), { type: 'module' }) /* Global Workers (Instantiated globally so all modules can access them) */
export const searchWorker = new Worker(new URL('./search.worker.js', import.meta.url), { type: 'module' })
