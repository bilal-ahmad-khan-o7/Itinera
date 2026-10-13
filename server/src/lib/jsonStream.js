/**
 * Incrementally pulls complete top-level JSON objects out of a text stream.
 * Works whether the model emits one object per line (JSON Lines) or
 * pretty-prints them, and ignores stray prose or ``` fences in between.
 */
export function createObjectStreamParser(onObject, onInvalid = () => {}) {
  let buffer = '';
  let depth = 0;
  let inString = false;
  let escaped = false;
  let start = -1;
  let scanned = 0;

  function push(text) {
    buffer += text;
    for (let i = scanned; i < buffer.length; i++) {
      const ch = buffer[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"' && depth > 0) inString = true;
      else if (ch === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === '}' && depth > 0) {
        depth--;
        if (depth === 0) {
          const raw = buffer.slice(start, i + 1);
          try {
            onObject(JSON.parse(raw));
          } catch {
            onInvalid(raw);
          }
          buffer = buffer.slice(i + 1);
          i = -1;
          start = -1;
        }
      }
    }
    scanned = buffer.length;
    // Drop text that can't be part of an object (prose between objects).
    if (depth === 0) {
      buffer = '';
      scanned = 0;
    }
  }

  return { push };
}
