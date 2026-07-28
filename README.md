# Klogg.js (High-Performance Browser Log Viewer)

A lightweight, zero-dependency, browser-native log stream visualizer inspired by Klogg. Built entirely using modern Web APIs, it allows developers and forensic analysts to view, tail, and run regex queries over multi-gigabyte log files locally without ever uploading sensitive data to a server.

## 🚀 Performance Architecture

To bypass the standard performance constraints of browser tabs (such as the 4GB sandboxed heap limit and single-threaded UI freezes), this engine splits data orchestration into a completely decoupled, asynchronous state-machine:

*   **Zero-RAM File Slicing:** Leverages the modern `File System Access API` to secure persistent local file handles. Instead of loading massive logs into system memory, it maps the exact byte positions of lines on disk. Reading and decoding text happens dynamically on-demand using microscopic file pointers via `File.slice()`.
*   **Asynchronous Web Workers:** Directs computationally intensive loops (like initial file indexing, stream chunk decoding, and regular expression sweeps) off the main UI thread into separate background context threads.
*   **GPU-Accelerated Virtualization:** Maintains a constant DOM size by rendering only the visible sliding window of rows (approx. ~35 lines). It handles infinite scrolling smoothly at 60+ FPS by applying native hardware-accelerated CSS `translateY()` transformations.
*   **Real-Time Delta Tailing:** Watches for file increments on disk and streams exclusively the newly appended byte blocks to the worker array, bypassing the need to re-index or re-evaluate historical files.

---

## 📁 File Structure

The project utilizes a strict one-way data flow model to isolate operational logic from global state management and prevent circular module dependencies:

```text
├── index.html          # Core layout viewport containers, canvas tracks, & theme variables
├── state.js            # Single source of truth (Stores file pointers, worker references, & UI dimensions)
├── app.js              # The central event orchestrator & keyboard shortcut router
├── main.js             # Continuous file-polling tail supervisor loop
├── minimap.js          # HTML5 Canvas rendering for tick marks & view windows
├── virtual-list.js     # Virtualized DOM scroller & real-time log-level syntax color highlighter
├── indexer.worker.js   # Background chunk reader for mapping byte offset locations
└── search.worker.js    # Background streaming engine for non-blocking regex pattern sweeps
```

---

## 🛠️ Key Features Built-In

1.  **F3 / Shift+F3 Navigation:** Hotkey query jumping that teleports the virtual viewport straight to target matches while highlighting tracking buffers in real time.
2.  **Live Regex Validator:** Scans user strings on the fly, color-coding input frames to dynamically warn against broken or unclosed regex expressions before passing instructions to the search worker.
3.  **Active Overlay Minimap:** Draws thousands of search query matches onto a pixel-mapped vertical canvas layout, equipped with an interactive frame box tracking viewport placement.
4.  **Resource Watchdog HUD:** Monitors hardware memory metrics and real-time JavaScript heap allocation bounds to proactively warn users if system limits are being approached.
5.  **Log-Level Syntax Mapping:** Automatically categorizes and tokenizes text lines on-screen (`ERROR`, `WARN`, `INFO`, `DEBUG`) applying specialized CSS themes on the fly.

---

## 🏁 Quick Start

Because this engine relies purely on vanilla JavaScript ECMAScript modules and native web specifications, it requires no heavy node building stages or dependency configurations.

1. Clone the repository to your machine.
2. Serve the directory using any simple local development server (necessary for ES modules and Web Worker module loading):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Or using Node.js / npx
   npx serve .
   ```
3. Open `http://localhost:8000` in a modern Chromium-based browser (Chrome, Edge, Opera) to exploit the full hardware-accelerated API stack.

## 📄 License
This project is open-source and available under the **MIT License**.
