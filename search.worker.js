self.onmessage = async (e) => {
  const { type, file, regexPattern, startLineIndex, lineOffsets } = e.data;
  const regex = new RegExp(regexPattern, 'gi');

  // Case A: Full Initial Search Sweep
  if (type === 'START_SEARCH') {
    const stream = file.stream();
    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');

    let matches = [];
    let currentLineIndex = 0;
    let partialLine = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const textChunk = partialLine + decoder.decode(value, { stream: true });
      const lines = textChunk.split('\n');
      partialLine = lines.pop();

      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) matches.push(currentLineIndex);
        currentLineIndex++;
      }
    }
    if (partialLine && regex.test(partialLine)) matches.push(currentLineIndex);

    self.postMessage({ type: 'SEARCH_COMPLETE', matches });
  }

  // Case B: PRIORITY ATTAINED - Incremental Search for Live Appending Tails
  else if (type === 'APPEND_SEARCH') {
    const startByte = lineOffsets[startLineIndex];
    // Fetch only the new bytes slice
    const appendBlob = file.slice(startByte, file.size);

    const rawText = await appendBlob.text();
    const lines = rawText.split('\n');
    let newMatches = [];

    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        newMatches.push(startLineIndex + i);
      }
    }

    self.postMessage({ type: 'SEARCH_APPEND_COMPLETE', newMatches });
  }
};
