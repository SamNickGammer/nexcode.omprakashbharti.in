import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

// Monaco loads its editor from a web worker / CDN loader that does not run under
// jsdom, so stub the React wrapper for this smoke test.
vi.mock("@monaco-editor/react", () => ({
  default: () => <div data-testid="monaco-editor" />,
}));

describe("App", () => {
  it("renders the NexCode shell with the editor mounted", () => {
    render(<App />);
    expect(screen.getByText("NexCode")).toBeInTheDocument();
    expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
  });
});
