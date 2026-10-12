
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import App from "./App";

describe("Frontend App", () => {
  it("renders without crashing", () => {
    const { container } = render(<App />);

    expect(container.firstChild).not.toBeNull();
  });
});
