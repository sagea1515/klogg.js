// virtual-list.js
import { state, LINE_HEIGHT, VIEWPORT_HEIGHT, BUFFER_LINES, viewport, phantom, container } from './state.js'
import { drawMinimap } from './minimap.js'

export function initVirtualList() {
  updateVirtualListDimensions()
  viewport.addEventListener('scroll', () => {
    requestAnimationFrame(() => {
      render()
      drawMinimap() // Redraw view overlay frame box as user scrolls
    })
  })
  render()
}

export function updateVirtualListDimensions() {
  const totalLinesCount = state.isFilterMode ? state.searchMatches.length : Math.max(0, state.globalLineOffsets.length - 1)
  phantom.style.height = `${totalLinesCount * LINE_HEIGHT}px`
}

export async function render() {
  if (!state.globalLineOffsets || state.globalLineOffsets.length === 0) return

  const scrollTop = viewport.scrollTop
  const totalAvailableLines = state.isFilterMode ? state.searchMatches.length : (state.globalLineOffsets.length - 1)

  let startLine = Math.floor(scrollTop / LINE_HEIGHT) - BUFFER_LINES
  let endLine = Math.ceil((scrollTop + VIEWPORT_HEIGHT) / LINE_HEIGHT) + BUFFER_LINES

  startLine = Math.max(0, startLine)
  endLine = Math.min(totalAvailableLines - 1, endLine)

  container.style.transform = `translateY(${startLine * LINE_HEIGHT}px)`

  let html = ''
  const regex = state.currentSearchQuery ? new RegExp(`(${escapeRegExp(state.currentSearchQuery)})`, 'gi') : null

  // Locate the for-loop inside your existing render() function in virtual-list.js
  for (let i = startLine; i <= endLine; i++) {
    const actualLogLineIndex = state.isFilterMode ? state.searchMatches[i] : i

    const startByte = state.globalLineOffsets[actualLogLineIndex]
    const endByte = state.globalLineOffsets[actualLogLineIndex + 1] || state.targetFile.size

    const blobSlice = state.targetFile.slice(startByte, endByte)
    let lineText = await blobSlice.text()
    lineText = lineText.replace(/\n$/, "")

    let escapedText = escapeHtml(lineText)

    // Log level styling scanner
    let logRowClass = ""
    const lowerText = lineText.toLowerCase()
    // Alternative slick styling: apply row classes but keep the raw log text clean
    if (lowerText.includes("error") || lowerText.includes("fatal") || lowerText.includes("crit")) {
      logRowClass = "log-row-error"
    } else if (lowerText.includes("warn")) {
      logRowClass = "log-row-warn"
    } else if (lowerText.includes("info")) {
      logRowClass = "log-row-info"
    } else if (lowerText.includes("debug") || lowerText.includes("trace")) {
      logRowClass = "log-row-debug"
    }

    // 2. Apply search matching highlights on top of the text if a query exists
    if (regex && state.currentSearchQuery) {
      escapedText = escapedText.replace(regex, `<mark style="background: #613214; color: #ff9d00; padding: 0 2px; border-radius: 2px;">$1</mark>`)
    }

    // 3. Inject the final row element using the newly dynamic logRowClass
    html += `
      <div class="${logRowClass}" style="height: ${LINE_HEIGHT}px; display: flex; align-items: center; white-space: pre; font-size: 13px; padding-right: 50px;">
        <span style="color: #858585; width: 60px; text-align: right; padding-right: 15px; user-select: none; flex-shrink: 0; background: #1e1e1e;">${actualLogLineIndex + 1}</span>
        <span style="padding-left: 5px;">${escapedText}</span>
      </div>
    `
  }

  container.innerHTML = html
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
