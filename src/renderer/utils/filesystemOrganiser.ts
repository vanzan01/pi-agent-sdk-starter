type ScanResult = {
  root: string;
  depth: number;
  limit: number;
  tree: unknown;
};

export function extractJsonBlob(text: string): unknown | null {
  const fenced = /```json([\s\S]*?)```/m.exec(text);
  const candidate = fenced ? fenced[1] : text;
  const braceStart = candidate.indexOf('{');
  const braceEnd = candidate.lastIndexOf('}');
  const bracketStart = candidate.indexOf('[');
  const bracketEnd = candidate.lastIndexOf(']');

  let start = -1;
  let end = -1;
  if (braceStart !== -1 && braceEnd > braceStart) {
    start = braceStart;
    end = braceEnd;
  } else if (bracketStart !== -1 && bracketEnd > bracketStart) {
    start = bracketStart;
    end = bracketEnd;
  }

  if (start === -1 || end === -1 || end <= start) return null;

  const blob = candidate.slice(start, end + 1);
  try {
    return JSON.parse(blob);
  } catch {
    return null;
  }
}

export function summarizeScan(scan: ScanResult | null) {
  if (!scan) return null;
  const summary = {
    files: 0,
    dirs: 0,
    extCounts: new Map<string, number>()
  };
  const walk = (node: Record<string, unknown> | null) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'file') {
      summary.files += 1;
      const ext = (node.name as string)?.split('.').pop()?.toLowerCase() || 'no-ext';
      summary.extCounts.set(ext, (summary.extCounts.get(ext) || 0) + 1);
    } else if (node.type === 'dir') {
      summary.dirs += 1;
      if (Array.isArray(node.children)) {
        node.children.forEach((child) => walk(child as Record<string, unknown> | null));
      }
    }
  };
  walk(scan.tree as Record<string, unknown> | null);
  return summary;
}

