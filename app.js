// app.js
import { state, LINE_HEIGHT, viewport, indexerWorker, searchWorker } from './state.js'
import { initVirtualList, render, updateVirtualListDimensions } from './virtual-list.js'
import { drawMinimap, initMinimapClick } from './minimap.js'
import { startTailingLoop } from './main.js'

const openFileBtn = document.getElementById('openFileBtn')
const searchInput = document.getElementById('searchInput')
const filterModeCheckbox = document.getElementById('filterModeCheckbox')
const tailModeCheckbox = document.getElementById('tailModeCheckbox')
const metricsDisplay = document.getElementById('searchMetrics')

initMinimapClick()

openFileBtn.addEventListener('click', async () => {
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'Log Files', accept: { 'text/plain': ['.log', '.txt'] } }]
    })
    state.targetFile = await fileHandle.getFile()
    state.globalLineOffsets = []
    state.searchMatches = []

    console.log(`Indexing target file: ${state.targetFile.name}`)
    indexerWorker.postMessage({ type: 'START_INDEX', file: state.targetFile })

    startTailingLoop(fileHandle)
  } catch (err) {
    console.error("File selection error:", err)
  }
})

indexerWorker.onmessage = (e) => {
  const { type, lineOffsets, percentage } = e.data
  if (type === 'INDEX_PROGRESS') {
    state.indexingProgressPercentage = percentage
    state.isIndexingComplete = false
    state.globalLineOffsets = lineOffsets
    updateLayoutAfterUpdate()
  }
  else if (type === 'COMPLETE') {
    state.globalLineOffsets = lineOffsets
    state.isIndexingComplete = true
    state.indexingProgressPercentage = 100
    initVirtualList()
    updateLayoutAfterUpdate()
  }

  else if (type === 'TAIL_UPDATE') {
    const oldLength = state.globalLineOffsets.length
    state.globalLineOffsets = lineOffsets

    if (state.currentSearchQuery !== "" && oldLength < state.globalLineOffsets.length) {
      searchWorker.postMessage({
        type: 'APPEND_SEARCH',
        file: state.targetFile,
        regexPattern: state.currentSearchQuery,
        startLineIndex: oldLength - 1,
        lineOffsets: state.globalLineOffsets
      })
    } else {
      updateLayoutAfterUpdate()
    }
  }
}

// 3. Real-Time Router for Search Workers - Reset tracker counters when search finishes
searchWorker.onmessage = (e) => {
  if (e.data.type === 'SEARCH_COMPLETE') {
    state.searchMatches = e.data.matches
    state.currentMatchSelectedIndex = state.searchMatches.length > 0 ? 0 : -1
    metricsDisplay.textContent = state.searchMatches.length > 0 ? `1 of ${state.searchMatches.length.toLocaleString()} matches` : `0 matches found`
    updateLayoutAfterUpdate()
  }
  else if (e.data.type === 'SEARCH_APPEND_COMPLETE') {
    state.searchMatches = state.searchMatches.concat(e.data.newMatches)
    metricsDisplay.textContent = `${state.searchMatches.length.toLocaleString()} matches found`
    updateLayoutAfterUpdate()
  }
}

function updateLayoutAfterUpdate() {
  updateVirtualListDimensions()
  if (tailModeCheckbox.checked) {
    viewport.scrollTop = viewport.scrollHeight
  }
  drawMinimap()
  render()
}

let searchTimeout
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout)
  const pattern = e.target.value.trim()

  if (pattern === "") {
    searchInput.style.borderColor = "#6b6b6b"
    searchInput.style.boxShadow = "none"
    state.currentSearchQuery = ""
    state.searchMatches = []
    state.currentMatchSelectedIndex = -1
    metricsDisplay.textContent = "0 matches found"
    updateLayoutAfterUpdate()
    return
  }

  try {
    new RegExp(pattern)
    searchInput.style.borderColor = "#0e639c"
    searchInput.style.boxShadow = "none"

    state.currentSearchQuery = pattern
    searchTimeout = setTimeout(() => {
      searchWorker.postMessage({
        type: 'START_SEARCH',
        file: state.targetFile,
        regexPattern: state.currentSearchQuery,
        lineOffsets: state.globalLineOffsets
      })
    }, 300)
  } catch (err) {
    searchInput.style.borderColor = "#f14c4c"
    searchInput.style.boxShadow = "0 0 5px rgba(241, 76, 76, 0.4)"
  }
})

window.addEventListener('keydown', (e) => {
  if (state.searchMatches.length === 0) return

  if (e.key === 'F3') {
    e.preventDefault()
    if (e.shiftKey) {
      state.currentMatchSelectedIndex--
      if (state.currentMatchSelectedIndex < 0) state.currentMatchSelectedIndex = state.searchMatches.length - 1
    } else {
      state.currentMatchSelectedIndex++
      if (state.currentMatchSelectedIndex >= state.searchMatches.length) state.currentMatchSelectedIndex = 0
    }

    const targetLineNumber = state.searchMatches[state.currentMatchSelectedIndex]
    metricsDisplay.textContent = `${state.currentMatchSelectedIndex + 1} of ${state.searchMatches.length.toLocaleString()} matches`

    viewport.scrollTop = state.isFilterMode ? state.currentMatchSelectedIndex * LINE_HEIGHT : targetLineNumber * LINE_HEIGHT

    drawMinimap()
    render()
  }
})

filterModeCheckbox.addEventListener('change', (e) => {
  state.isFilterMode = e.target.checked
  viewport.scrollTop = 0
  updateLayoutAfterUpdate()
})

// Watchdog Monitor
setInterval(() => {
  if (performance && performance.memory) {
    const usedMb = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
    const limitMb = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
    document.getElementById('usedHeapMetric').textContent = usedMb
    document.getElementById('limitHeapMetric').textContent = limitMb
    document.getElementById('heapContainer').style.color = (usedMb / limitMb > 0.85) ? '#f14c4c' : '#aaaaaa'
  }
}, 1000)
