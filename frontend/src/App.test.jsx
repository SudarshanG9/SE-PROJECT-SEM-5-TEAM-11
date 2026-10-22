import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import App from "./App";

const mergeEndpoint = "http://localhost:3000/api/merge";
const inputKeys = {
  Base: "base",
  "Branch A": "branchA",
  "Branch B": "branchB",
};

function fillInputs({
  base = "const value = 1;",
  branchA = "const value = 2;",
  branchB = "const value = 3;",
} = {}) {
  fireEvent.change(screen.getByLabelText("Base"), {
    target: { value: base },
  });
  fireEvent.change(screen.getByLabelText("Branch A"), {
    target: { value: branchA },
  });
  fireEvent.change(screen.getByLabelText("Branch B"), {
    target: { value: branchB },
  });
}

function mockMergeResponse(payload, { ok = true, status = 200 } = {}) {
  fetch.mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(payload),
  });
}

describe("Frontend merge features", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  describe("real merge integration", () => {
    it("sends Base, Branch A, and Branch B to the backend merge endpoint", async () => {
      mockMergeResponse({
        mergedCode: "const value = 2;",
        hasConflict: false,
        message: "Merge completed successfully",
        conflicts: [],
      });
      render(<App />);
      fillInputs();

      fireEvent.click(screen.getByRole("button", { name: "Simulate Merge" }));

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      expect(fetch).toHaveBeenCalledWith(mergeEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base: "const value = 1;",
          branchA: "const value = 2;",
          branchB: "const value = 3;",
        }),
      });
    });
  });

  describe("input validation and error messages", () => {
    it.each(["Base", "Branch A", "Branch B"])(
      "does not call the backend and explains when %s is missing",
      async (missingInput) => {
        render(<App />);
        fillInputs({ [inputKeys[missingInput]]: "" });

        fireEvent.click(screen.getByRole("button", { name: "Simulate Merge" }));

        expect(fetch).not.toHaveBeenCalled();
        expect(await screen.findByRole("alert")).toHaveTextContent(missingInput);
      }
    );

    it("displays a readable validation error returned by the backend", async () => {
      mockMergeResponse(
        { error: "Base, Branch A, and Branch B must be provided." },
        { ok: false, status: 400 }
      );
      render(<App />);
      fillInputs();

      fireEvent.click(screen.getByRole("button", { name: "Simulate Merge" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Base, Branch A, and Branch B must be provided."
      );
    });

    it("displays a readable message when the backend request fails", async () => {
      fetch.mockRejectedValue(new Error("Backend is unavailable"));
      render(<App />);
      fillInputs();

      fireEvent.click(screen.getByRole("button", { name: "Simulate Merge" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /unable to reach the merge service|backend is unavailable/i
      );
    });
  });

  describe("merge result display", () => {
    it("separates successful status from the actual merged output", async () => {
      mockMergeResponse({
        mergedCode: "const value = 2;",
        hasConflict: false,
        message: "Merge completed successfully",
        conflicts: [],
      });
      render(<App />);
      fillInputs();

      fireEvent.click(screen.getByRole("button", { name: "Simulate Merge" }));

      expect(
        await screen.findByText("Merge completed successfully")
      ).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Merge status" })).toBeInTheDocument();
      expect(screen.getByText("Successful merge")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Merged output" })).toBeInTheDocument();
      expect(screen.getByText("const value = 2;", { selector: "pre" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Conflict details" })).not.toBeInTheDocument();
    });

    it("shows conflict status, merged output, and individual conflict details", async () => {
      mockMergeResponse({
        mergedCode: "<<<<<<< BRANCH A\nconst value = 2;\n=======\nconst value = 3;\n>>>>>>> BRANCH B",
        hasConflict: true,
        message: "Merge completed with 1 conflict(s)",
        conflicts: [
          {
            id: 1,
            startLine: 1,
            endLine: 1,
            base: "const value = 1;",
            branchA: "const value = 2;",
            branchB: "const value = 3;",
          },
        ],
      });
      render(<App />);
      fillInputs();

      fireEvent.click(screen.getByRole("button", { name: "Simulate Merge" }));

      expect(
        await screen.findByText("Merge completed with 1 conflict(s)")
      ).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Merge status" })).toBeInTheDocument();
      expect(screen.getByText("Conflicts require attention")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Merged output" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Conflict details" })).toBeInTheDocument();
      expect(screen.getByText("const value = 1;", { selector: "pre" })).toBeInTheDocument();
      expect(screen.getByText("const value = 2;", { selector: "pre" })).toBeInTheDocument();
      expect(screen.getByText("const value = 3;", { selector: "pre" })).toBeInTheDocument();
      expect(screen.getByText(/line 1/i)).toBeInTheDocument();
    });
  });
});
