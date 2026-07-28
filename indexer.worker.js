// indexer.worker.js full update loop configuration
let lineOffsets = null; // The first line of any file always starts at byte 0
let totalBytesProcessed = 0;

self.onmessage = async (e) => {
  const { type, file, blob, previousSize } = e.data;

  // --- CASE A: Initial Full File Sweep ---
  if (type === 'START_INDEX') {
    // Reset our tracking state for a new file load
    lineOffsets = [];
    totalBytesProcessed = 0;

    const stream = file.stream();
    const reader = stream.getReader();
    let lineCount = 1;
    const totalFileSize = file.size;
    let lastProgressUpdateTimestamp = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Scan the incoming binary chunk for the newline character (LF = byte 10)
      for (let i = 0; i < value.length; i++) {
        if (value[i] === 10) { // '\n'
          const nextLineOffset = totalBytesProcessed + i + 1;
          lineOffsets.push(nextLineOffset);
          lineCount++;
        }
      }

      totalBytesProcessed += value.length;

      // Send layout data every 100ms so files feel interactive while indexing
      const now = Date.now();
      if (now - lastProgressUpdateTimestamp > 100) {
        const percentage = Math.round((totalBytesProcessed / totalFileSize) * 100);
        self.postMessage({ type: 'INDEX_PROGRESS', lineOffsets, percentage, totalLines: lineCount });
        lastProgressUpdateTimestamp = now;
      }
    }

    self.postMessage({ type: 'COMPLETE', lineOffsets, totalLines: lineCount });
  }

  // --- CASE B: Live Tailing Incremental Append ---
  else if (type === 'APPEND_CHUNK') {
    const stream = blob.stream();
    const reader = stream.getReader();
    let localOffsetCounter = previousSize;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      for (let i = 0; i < value.length; i++) {
        if (value[i] === 10) { // '\n'
          const absoluteLineOffset = localOffsetCounter + i + 1;
          lineOffsets.push(absoluteLineOffset);
        }
      }
      localOffsetCounter += value.length;
    }

    totalBytesProcessed = localOffsetCounter;

    // Pass the expanded map back to app.js
    self.postMessage({
      type: 'TAIL_UPDATE',
      lineOffsets: lineOffsets,
      totalLines: lineOffsets.length
    });
  }
};
