// Tiny subsequence fuzzy matcher for the Cmd+P file finder. Not as fancy as
// fzf, but dependency-free and good enough: it rewards consecutive matches,
// matches right after a path separator or word boundary, and earlier matches.

export interface FuzzyMatch<T> {
  item: T;
  score: number;
}

const SEPARATORS = new Set(["/", "\\", "_", "-", ".", " "]);

/**
 * Score how well `query` fuzzy-matches `target`. Returns a number (higher is
 * better) or null when `query` is not a subsequence of `target`.
 */
export function scoreFuzzy(query: string, target: string): number | null {
  if (query.length === 0) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  let score = 0;
  let qi = 0;
  let prevMatchIdx = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue;

    let bonus = 1;
    if (ti === prevMatchIdx + 1) bonus += 5; // consecutive
    if (ti === 0 || SEPARATORS.has(t[ti - 1]!)) bonus += 8; // boundary start
    bonus += Math.max(0, 3 - Math.floor(ti / 20)); // earlier is slightly better

    score += bonus;
    prevMatchIdx = ti;
    qi++;
  }

  if (qi < q.length) return null; // not all query chars matched

  // Prefer shorter targets when scores are otherwise close.
  score -= t.length * 0.05;
  return score;
}

/** Filter + rank `items` by how well `query` matches `key(item)`. */
export function fuzzyFilter<T>(
  query: string,
  items: T[],
  key: (item: T) => string,
  limit = 100,
): FuzzyMatch<T>[] {
  const results: FuzzyMatch<T>[] = [];
  for (const item of items) {
    const score = scoreFuzzy(query, key(item));
    if (score !== null) results.push({ item, score });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
