import request from "supertest";
import app from "../server.js";
import repositoryStore from "../repositories.js";
import fileStore from "../files.js";
import { describe, it, expect, beforeEach } from "vitest";

const {
  createRepository,
  clearRepositories,
} = repositoryStore;

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

describe("File management REST API", () => {
  let repository;

  beforeEach(() => {
    clearFiles();
    clearRepositories();

    repository = createRepository({
      name: "Test Repository",
      description: "Repository for file API tests",
    });
  });

  
  describe("GET /api/repositories/:id/files", () => {
    it("returns all files in a repository", async () => {
      createFile({
        repositoryId: repository.id,
        name: "index.js",
        content: "console.log('Hello');",
      });

      const response = await request(app)
        .get(`/api/repositories/${repository.id}/files`);

      expect(response.status).toBe(200);
      expect(response.body.files).toHaveLength(1);
      expect(response.body.files[0].name).toBe("index.js");
    });

    it("returns 404 for a missing repository", async () => {
      const response = await request(app)
        .get("/api/repositories/unknown/files");

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Repository not found.");
    });
  });

  describe("POST /api/repositories/:id/files", () => {
    it("creates a file successfully", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "index.js",
          content: "console.log('Hello');",
        });

      expect(response.status).toBe(201);
      expect(response.body.file.name).toBe("index.js");
      expect(response.body.file.content).toBe("console.log('Hello');");
      expect(response.body.file.repositoryId).toBe(repository.id);
    });

    it("creates a file with empty content when content is omitted", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "README.md",
        });

      expect(response.status).toBe(201);
      expect(response.body.file.content).toBe("");
    });

    it("rejects an empty filename", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: " ",
          content: "",
        });

      expect(response.status).toBe(400);
    });

    it("rejects a filename containing a path separator", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "../index.js",
          content: "",
        });

      expect(response.status).toBe(400);
    });

    it("rejects non-string content", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "index.js",
          content: 123,
        });

      expect(response.status).toBe(400);
    });

    it("rejects duplicate filenames", async () => {
      await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "index.js",
          content: "",
        });

      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "INDEX.JS",
          content: "",
        });

      expect(response.status).toBe(409);
    });

    it("returns 404 when creating a file in a missing repository", async () => {
      const response = await request(app)
        .post("/api/repositories/unknown/files")
        .send({
          name: "index.js",
          content: "",
        });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/repositories/:id/files/:fileId", () => {
    it("returns a file by ID", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "index.js",
        content: "Hello",
      });

      const response = await request(app)
        .get(`/api/repositories/${repository.id}/files/${created.id}`);

      expect(response.status).toBe(200);
      expect(response.body.file.id).toBe(created.id);
      expect(response.body.file.content).toBe("Hello");
    });

    it("returns 404 when the file does not exist", async () => {
      const response = await request(app)
        .get(`/api/repositories/${repository.id}/files/unknown`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("File not found.");
    });

    it("does not expose a file through another repository", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "index.js",
      });

      const response = await request(app)
        .get(`/api/repositories/another-repo/files/${created.id}`);

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/repositories/:id/files/:fileId", () => {
    it("updates file content", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "index.js",
        content: "Old content",
      });

      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/${created.id}`)
        .send({
          content: "New content",
        });

      expect(response.status).toBe(200);
      expect(response.body.file.content).toBe("New content");
    });

    it("updates the filename", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "old.js",
      });

      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/${created.id}`)
        .send({
          name: "new.js",
        });

      expect(response.status).toBe(200);
      expect(response.body.file.name).toBe("new.js");
    });

    it("rejects an empty update body", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "index.js",
      });

      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/${created.id}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it("rejects duplicate filenames during update", async () => {
      createFile({
        repositoryId: repository.id,
        name: "existing.js",
      });

      const created = createFile({
        repositoryId: repository.id,
        name: "another.js",
      });

      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/${created.id}`)
        .send({
          name: "existing.js",
        });

      expect(response.status).toBe(409);
    });

    it("returns 404 when updating a missing file", async () => {
      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/unknown`)
        .send({
          content: "Updated",
        });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/repositories/:id/files/:fileId", () => {
    it("deletes a file successfully", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "index.js",
      });

      const response = await request(app)
        .delete(`/api/repositories/${repository.id}/files/${created.id}`);

      expect(response.status).toBe(200);

      expect(
        getFileById(repository.id, created.id)
      ).toBeNull();
    });

    it("returns 404 when deleting a missing file", async () => {
      const response = await request(app)
        .delete(`/api/repositories/${repository.id}/files/unknown`);

      expect(response.status).toBe(404);
    });
  });
});
