
import { describe, it, expect, beforeEach } from "vitest";
import fileStore from "../files.js";

const {
  createFile,
  getFiles,
  getFileById,
  updateFile,
  deleteFile,
  clearFiles,
} = fileStore;

describe("File management data layer", () => {
  beforeEach(() => {
    clearFiles();
  });

  // CREATE FILE TESTS
  describe("createFile()", () => {
    it("creates a file with a unique ID and timestamps", () => {
      const file = createFile({
        repositoryId: "repo-1",
        name: "index.js",
        content: "console.log('Hello');",
      });

      expect(file.id).toBeTruthy();
      expect(file.repositoryId).toBe("repo-1");
      expect(file.name).toBe("index.js");
      expect(file.content).toBe("console.log('Hello');");
      expect(file.createdAt).toBeTruthy();
      expect(file.updatedAt).toBeTruthy();
    });

    it("trims whitespace from the filename", () => {
      const file = createFile({
        repositoryId: "repo-1",
        name: "  index.js  ",
      });

      expect(file.name).toBe("index.js");
      expect(file.content).toBe("");
    });

    it("rejects a missing repository ID", () => {
      expect(() =>
        createFile({
          name: "index.js",
        })
      ).toThrow("A valid repository ID is required.");
    });

    it("rejects an empty filename", () => {
      expect(() =>
        createFile({
          repositoryId: "repo-1",
          name: "   ",
        })
      ).toThrow("A non-empty file name is required.");
    });

    it("rejects non-string file content", () => {
      expect(() =>
        createFile({
          repositoryId: "repo-1",
          name: "index.js",
          content: 123,
        })
      ).toThrow("File content must be a string.");
    });
  });

  // GET ALL FILES TESTS
  describe("getFiles()", () => {
    it("returns only files belonging to the requested repository", () => {
      createFile({
        repositoryId: "repo-1",
        name: "index.js",
      });

      createFile({
        repositoryId: "repo-2",
        name: "app.js",
      });

      const result = getFiles("repo-1");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("index.js");
    });

    it("returns an empty array when no files exist", () => {
      expect(getFiles("repo-1")).toEqual([]);
    });

    it("sorts files alphabetically by filename", () => {
      createFile({
        repositoryId: "repo-1",
        name: "main.js",
      });

      createFile({
        repositoryId: "repo-1",
        name: "app.js",
      });

      createFile({
        repositoryId: "repo-1",
        name: "index.js",
      });

      const result = getFiles("repo-1");

      expect(result.map((file) => file.name)).toEqual([
        "app.js",
        "index.js",
        "main.js",
      ]);
    });
  });

  // GET FILE BY ID TESTS
  describe("getFileById()", () => {
    it("returns a file when the ID and repository match", () => {
      const created = createFile({
        repositoryId: "repo-1",
        name: "index.js",
        content: "Hello",
      });

      const result = getFileById("repo-1", created.id);

      expect(result).not.toBeNull();
      expect(result.id).toBe(created.id);
    });

    it("returns null when the file does not exist", () => {
      expect(getFileById("repo-1", "unknown-id")).toBeNull();
    });

    it("does not expose a file through another repository", () => {
      const created = createFile({
        repositoryId: "repo-1",
        name: "index.js",
      });

      expect(getFileById("repo-2", created.id)).toBeNull();
    });
  });

  // UPDATE FILE TESTS
  describe("updateFile()", () => {
    it("updates file content", () => {
      const created = createFile({
        repositoryId: "repo-1",
        name: "index.js",
        content: "Old content",
      });

      const updated = updateFile("repo-1", created.id, {
        content: "New content",
      });

      expect(updated.content).toBe("New content");
      expect(updated.name).toBe("index.js");
    });

    it("updates and trims the filename", () => {
      const created = createFile({
        repositoryId: "repo-1",
        name: "old.js",
      });

      const updated = updateFile("repo-1", created.id, {
        name: "  new.js  ",
      });

      expect(updated.name).toBe("new.js");
    });

    it("updates the updatedAt timestamp", () => {
      const created = createFile({
        repositoryId: "repo-1",
        name: "index.js",
      });

      const updated = updateFile("repo-1", created.id, {
        content: "Updated",
      });

      expect(updated.updatedAt).toBeTruthy();

      expect(
        new Date(updated.updatedAt).getTime()
      ).toBeGreaterThanOrEqual(
        new Date(created.updatedAt).getTime()
      );
    });

    it("returns null when the file does not exist", () => {
      expect(
        updateFile("repo-1", "unknown-id", {
          content: "Updated",
        })
      ).toBeNull();
    });

    it("rejects an empty updated filename", () => {
      const created = createFile({
        repositoryId: "repo-1",
        name: "index.js",
      });

      expect(() =>
        updateFile("repo-1", created.id, {
          name: " ",
        })
      ).toThrow("File name must be a non-empty string.");
    });

    it("rejects non-string updated content", () => {
      const created = createFile({
        repositoryId: "repo-1",
        name: "index.js",
      });

      expect(() =>
        updateFile("repo-1", created.id, {
          content: 123,
        })
      ).toThrow("File content must be a string.");
    });
  });

  // DELETE FILE TESTS
  describe("deleteFile()", () => {
    it("deletes an existing file", () => {
      const created = createFile({
        repositoryId: "repo-1",
        name: "index.js",
      });

      expect(deleteFile("repo-1", created.id)).toBe(true);
      expect(getFileById("repo-1", created.id)).toBeNull();
    });

    it("returns false when the file does not exist", () => {
      expect(deleteFile("repo-1", "unknown-id")).toBe(false);
    });

    it("does not delete a file belonging to another repository", () => {
      const created = createFile({
        repositoryId: "repo-1",
        name: "index.js",
      });

      expect(deleteFile("repo-2", created.id)).toBe(false);
      expect(getFileById("repo-1", created.id)).not.toBeNull();
    });
  });

  // CLEAR FILES TESTS
  describe("clearFiles()", () => {
    it("clears all files when no repository ID is supplied", () => {
      createFile({
        repositoryId: "repo-1",
        name: "one.js",
      });

      createFile({
        repositoryId: "repo-2",
        name: "two.js",
      });

      clearFiles();

      expect(getFiles("repo-1")).toEqual([]);
      expect(getFiles("repo-2")).toEqual([]);
    });

    it("clears only the files belonging to the supplied repository", () => {
      createFile({
        repositoryId: "repo-1",
        name: "one.js",
      });

      createFile({
        repositoryId: "repo-2",
        name: "two.js",
      });

      clearFiles("repo-1");

      expect(getFiles("repo-1")).toEqual([]);
      expect(getFiles("repo-2")).toHaveLength(1);
    });
  });
});
