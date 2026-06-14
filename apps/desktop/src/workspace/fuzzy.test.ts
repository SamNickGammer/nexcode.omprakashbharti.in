import { describe, expect, it } from "vitest";
import { fuzzyFilter, scoreFuzzy } from "./fuzzy";

describe("scoreFuzzy", () => {
  it("returns null when the query is not a subsequence", () => {
    expect(scoreFuzzy("xyz", "app.tsx")).toBeNull();
  });

  it("matches a subsequence", () => {
    expect(scoreFuzzy("app", "App.tsx")).not.toBeNull();
  });

  it("scores a consecutive match higher than chars spread mid-token", () => {
    const tight = scoreFuzzy("app", "app.ts")!;
    const loose = scoreFuzzy("app", "axxxpxxxp.ts")!;
    expect(tight).toBeGreaterThan(loose);
  });
});

describe("fuzzyFilter", () => {
  const files = ["src/App.tsx", "src/workspace/store.ts", "src/editor/Editor.tsx", "README.md"];

  it("ranks the closest filename first", () => {
    const results = fuzzyFilter("app", files, (f) => f);
    expect(results[0]?.item).toBe("src/App.tsx");
  });

  it("excludes non-matches", () => {
    const results = fuzzyFilter("zzz", files, (f) => f);
    expect(results).toHaveLength(0);
  });

  it("respects the limit", () => {
    const results = fuzzyFilter("s", files, (f) => f, 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });
});
