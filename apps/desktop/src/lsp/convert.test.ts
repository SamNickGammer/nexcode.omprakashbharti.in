import { describe, expect, it } from "vitest";
import {
  diagnosticToMarker,
  hoverContentsToMarkdown,
  positionToLsp,
  positionToMonaco,
  severityToMonaco,
} from "./convert";

describe("severityToMonaco", () => {
  it("maps LSP severities to Monaco marker severities", () => {
    expect(severityToMonaco(1)).toBe(8); // Error
    expect(severityToMonaco(2)).toBe(4); // Warning
    expect(severityToMonaco(3)).toBe(2); // Info
    expect(severityToMonaco(4)).toBe(1); // Hint
  });
  it("defaults missing severity to Error", () => {
    expect(severityToMonaco(undefined)).toBe(8);
  });
});

describe("position conversion", () => {
  it("LSP (0-based) → Monaco (1-based)", () => {
    expect(positionToMonaco({ line: 0, character: 0 })).toEqual({ lineNumber: 1, column: 1 });
    expect(positionToMonaco({ line: 4, character: 2 })).toEqual({ lineNumber: 5, column: 3 });
  });
  it("Monaco (1-based) → LSP (0-based) round-trips", () => {
    expect(positionToLsp(5, 3)).toEqual({ line: 4, character: 2 });
  });
});

describe("diagnosticToMarker", () => {
  it("converts ranges and severity", () => {
    const marker = diagnosticToMarker({
      range: { start: { line: 2, character: 4 }, end: { line: 2, character: 9 } },
      message: "Cannot find name 'foo'.",
      severity: 1,
      source: "ts",
      code: 2304,
    });
    expect(marker).toMatchObject({
      message: "Cannot find name 'foo'.",
      severity: 8,
      startLineNumber: 3,
      startColumn: 5,
      endLineNumber: 3,
      endColumn: 10,
      source: "ts",
      code: "2304",
    });
  });
});

describe("hoverContentsToMarkdown", () => {
  it("handles plain strings", () => {
    expect(hoverContentsToMarkdown("hello")).toBe("hello");
  });
  it("wraps MarkedString with language fences", () => {
    expect(hoverContentsToMarkdown({ language: "ts", value: "const x: number" })).toBe(
      "```ts\nconst x: number\n```",
    );
  });
  it("joins arrays", () => {
    expect(hoverContentsToMarkdown(["a", { value: "b" }])).toBe("a\n\nb");
  });
});
