
import request from "supertest";
import { createRequire } from "node:module";
import { describe, it, expect, beforeEach } from "vitest";

// Exercise the actual CommonJS server and matching stores, rather than the
// replacement file route handlers installed by vitest.setup.js.
const require = createRequire(import.meta.url);
const app = require("../server.js");
const repositoryStore = require("../repositories.js");
const fileStore = require("../files.js");

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

// ==========================================
// FILE MANAGEMENT DATA LAYER TESTS
// ==========================================

describe("File management data layer", () => {
  let repository1;
  let repository2;

  beforeEach(() => {
    clearFiles();
    clearRepositories();

    repository1 = createRepository({
      name: "Test Repository 1",
      description: "First test repository",
    });

    repository2 = createRepository({
      name: "Test Repository 2",
      description: "Second test repository",
    });
  });

  // CREATE FILE TESTS
  describe("createFile()", () => {
    it("creates a file with a unique ID and timestamps", () => {
      const file = createFile({
        repositoryId: repository1.id,
        name: "index.js",
        content: "console.log('Hello');",
      });

      expect(file.id).toBeTruthy();
      expect(file.repositoryId).toBe(repository1.id);
      expect(file.name).toBe("index.js");
      expect(file.content).toBe("console.log('Hello');");
      expect(file.createdAt).toBeTruthy();
      expect(file.updatedAt).toBeTruthy();
    });

    it("trims whitespace from the filename", () => {
      const file = createFile({
        repositoryId: repository1.id,
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
          repositoryId: repository1.id,
          name: "   ",
        })
      ).toThrow("A non-empty file name is required.");
    });

    it("rejects non-string file content", () => {
      expect(() =>
        createFile({
          repositoryId: repository1.id,
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
        repositoryId: repository1.id,
        name: "index.js",
      });

      createFile({
        repositoryId: repository2.id,
        name: "app.js",
      });

      const result = getFiles(repository1.id);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("index.js");
    });

    it("returns an empty array when no files exist", () => {
      expect(getFiles(repository1.id)).toEqual([]);
    });

    it("sorts files alphabetically by filename", () => {
      createFile({
        repositoryId: repository1.id,
        name: "main.js",
      });

      createFile({
        repositoryId: repository1.id,
        name: "app.js",
      });

      createFile({
        repositoryId: repository1.id,
        name: "index.js",
      });

      const result = getFiles(repository1.id);

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
        repositoryId: repository1.id,
        name: "index.js",
        content: "Hello",
      });

      const result = getFileById(repository1.id, created.id);

      expect(result).not.toBeNull();
      expect(result.id).toBe(created.id);
    });

    it("returns null when the file does not exist", () => {
      expect(
        getFileById(repository1.id, "unknown-id")
      ).toBeNull();
    });

    it("does not expose a file through another repository", () => {
      const created = createFile({
        repositoryId: repository1.id,
        name: "index.js",
      });

      expect(
        getFileById(repository2.id, created.id)
      ).toBeNull();
    });
  });

  // UPDATE FILE TESTS
  describe("updateFile()", () => {
    it("updates file content", () => {
      const created = createFile({
        repositoryId: repository1.id,
        name: "index.js",
        content: "Old content",
      });

      const updated = updateFile(
        repository1.id,
        created.id,
        {
          content: "New content",
        }
      );

      expect(updated.content).toBe("New content");
      expect(updated.name).toBe("index.js");
    });

    it("updates and trims the filename", () => {
      const created = createFile({
        repositoryId: repository1.id,
        name: "old.js",
      });

      const updated = updateFile(
        repository1.id,
        created.id,
        {
          name: "  new.js  ",
        }
      );

      expect(updated.name).toBe("new.js");
    });

    it("updates the updatedAt timestamp", () => {
      const created = createFile({
        repositoryId: repository1.id,
        name: "index.js",
      });

      const updated = updateFile(
        repository1.id,
        created.id,
        {
          content: "Updated",
        }
      );

      expect(updated.updatedAt).toBeTruthy();

      expect(
        new Date(updated.updatedAt).getTime()
      ).toBeGreaterThanOrEqual(
        new Date(created.updatedAt).getTime()
      );
    });

    it("returns null when the file does not exist", () => {
      expect(
        updateFile(
          repository1.id,
          "unknown-id",
          {
            content: "Updated",
          }
        )
      ).toBeNull();
    });

    it("rejects an empty updated filename", () => {
      const created = createFile({
        repositoryId: repository1.id,
        name: "index.js",
      });

      expect(() =>
        updateFile(
          repository1.id,
          created.id,
          {
            name: " ",
          }
        )
      ).toThrow("File name must be a non-empty string.");
    });

    it("rejects non-string updated content", () => {
      const created = createFile({
        repositoryId: repository1.id,
        name: "index.js",
      });

      expect(() =>
        updateFile(
          repository1.id,
          created.id,
          {
            content: 123,
          }
        )
      ).toThrow("File content must be a string.");
    });
  });

  // DELETE FILE TESTS
  describe("deleteFile()", () => {
    it("deletes an existing file", () => {
      const created = createFile({
        repositoryId: repository1.id,
        name: "index.js",
      });

      expect(
        deleteFile(repository1.id, created.id)
      ).toBe(true);

      expect(
        getFileById(repository1.id, created.id)
      ).toBeNull();
    });

    it("returns false when the file does not exist", () => {
      expect(
        deleteFile(repository1.id, "unknown-id")
      ).toBe(false);
    });

    it("does not delete a file belonging to another repository", () => {
      const created = createFile({
        repositoryId: repository1.id,
        name: "index.js",
      });

      expect(
        deleteFile(repository2.id, created.id)
      ).toBe(false);

      expect(
        getFileById(repository1.id, created.id)
      ).not.toBeNull();
    });
  });

  // CLEAR FILES TESTS
  describe("clearFiles()", () => {
    it("clears all files when no repository ID is supplied", () => {
      createFile({
        repositoryId: repository1.id,
        name: "one.js",
      });

      createFile({
        repositoryId: repository2.id,
        name: "two.js",
      });

      clearFiles();

      expect(getFiles(repository1.id)).toEqual([]);
      expect(getFiles(repository2.id)).toEqual([]);
    });

    it("clears only the files belonging to the supplied repository", () => {
      createFile({
        repositoryId: repository1.id,
        name: "one.js",
      });

      createFile({
        repositoryId: repository2.id,
        name: "two.js",
      });

      clearFiles(repository1.id);

      expect(getFiles(repository1.id)).toEqual([]);
      expect(getFiles(repository2.id)).toHaveLength(1);
    });
  });
});

// ==========================================
// FILE MANAGEMENT REST API TESTS
// ==========================================

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

  // GET ALL FILES API
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

  // CREATE FILE API
  describe("POST /api/repositories/:id/files", () => {
    it("accepts supported file extensions regardless of case", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "MODULE.TS",
          content: "export const value = 42;",
        });

      expect(response.status).toBe(201);
      expect(response.body.file.name).toBe("MODULE.TS");

      const files = getFiles(repository.id);

      expect(files).toHaveLength(1);
      expect(files[0].content).toBe("export const value = 42;");
    });

    it("accepts Unicode content exactly at the 1 MB byte limit", async () => {
      const content = "é".repeat(524288);

      expect(Buffer.byteLength(content, "utf8")).toBe(
        1024 * 1024
      );

      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "unicode.txt",
          content,
        });

      expect(response.status).toBe(201);

      expect(
        Buffer.byteLength(response.body.file.content, "utf8")
      ).toBe(1024 * 1024);
    });

    it("rejects Unicode content one byte above the limit", async () => {
      const content = "é".repeat(524288) + "x";

      expect(Buffer.byteLength(content, "utf8")).toBe(
        1024 * 1024 + 1
      );

      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "oversized-unicode.txt",
          content,
        });

      expect(response.status).toBe(413);

      expect(response.body.error).toContain(
        "1 MB limit"
      );

      expect(getFiles(repository.id)).toHaveLength(0);
    });

    it("rejects client-supplied file identifiers", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "secure.js",
          content: "const safe = true;",
          id: "attacker-controlled-id",
        });

      expect(response.status).toBe(400);

      expect(response.body.error).toBe(
        "File request contains unsupported fields."
      );

      expect(getFiles(repository.id)).toHaveLength(0);
    });

    it("rejects unauthorized file metadata during creation", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "example.js",
          content: "example",
          repositoryId: "another-repository",
          createdAt: "2000-01-01T00:00:00.000Z",
        });

      expect(response.status).toBe(400);

      expect(response.body.error).toBe(
        "File request contains unsupported fields."
      );

      expect(getFiles(repository.id)).toHaveLength(0);
    });

    it("rejects unexpected metadata objects", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "example.js",
          content: "safe",
          metadata: {
            owner: "admin",
            protected: false,
          },
        });

      expect(response.status).toBe(400);

      expect(getFiles(repository.id)).toHaveLength(0);
    });

    it("rejects prototype-related JSON properties", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .set("Content-Type", "application/json")
        .send(
          '{"name":"safe.js","content":"safe","__proto__":{"isAdmin":true}}'
        );

      expect(response.status).toBe(400);

      expect(response.body.error).toBe(
        "File request contains unsupported fields."
      );

      expect(getFiles(repository.id)).toHaveLength(0);
    });

    it("rejects file creation with an unsupported content type", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .set("Content-Type", "text/plain")
        .send("name=invalid.js");

      expect(response.status).toBe(415);
      expect(response.body.error).toBe(
        "File API requests must use application/json."
      );
      expect(getFiles(repository.id)).toHaveLength(0);
    });

    it("rejects array request bodies during file creation", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send([
          {
            name: "invalid.js",
            content: "example",
          },
        ]);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "File API request body must be a JSON object."
      );
      expect(getFiles(repository.id)).toHaveLength(0);
    });

    it("returns a safe JSON error for malformed requests", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .set("Content-Type", "application/json")
        .send('{"name":');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "Invalid JSON request body.",
      });
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(getFiles(repository.id)).toHaveLength(0);
    });

    it("returns a safe error for oversized file API requests", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "oversized.txt",
          content: "x".repeat(2 * 1024 * 1024 + 128),
        });

      expect(response.status).toBe(413);
      expect(response.body.error).toBe(
        "File API request body is too large."
      );
      expect(getFiles(repository.id)).toHaveLength(0);
    });

    it("rejects unsupported file extensions", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "malware.exe",
          content: "example",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain(
        "Unsupported file type"
      );

      expect(getFiles(repository.id)).toHaveLength(0);
    });

    it("rejects file content larger than 1 MB", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "large.js",
          content: "x".repeat(1024 * 1024 + 1),
        });

      expect(response.status).toBe(413);
      expect(response.body.error).toContain(
        "1 MB limit"
      );

      expect(getFiles(repository.id)).toHaveLength(0);
    });

    it("accepts file content exactly at the 1 MB limit", async () => {
      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "allowed.txt",
          content: "x".repeat(1024 * 1024),
        });

      expect(response.status).toBe(201);
      expect(
        Buffer.byteLength(response.body.file.content, "utf8")
      ).toBe(1024 * 1024);
    });

    it("checks UTF-8 byte size instead of character count", async () => {
      const content = "€".repeat(350000);

      expect(content.length).toBeLessThan(1024 * 1024);

      const response = await request(app)
        .post(`/api/repositories/${repository.id}/files`)
        .send({
          name: "unicode.txt",
          content,
        });

      expect(response.status).toBe(413);
      expect(getFiles(repository.id)).toHaveLength(0);
    });
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

    it.each(["bad\u0000name.js", "bad\nname.js"])(
      "rejects unsafe filename %j",
      async (name) => {
        const response = await request(app)
          .post(`/api/repositories/${repository.id}/files`)
          .send({ name, content: "" });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("control characters");
        expect(getFiles(repository.id)).toHaveLength(0);
      }
    );

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

  // GET FILE BY ID API
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

  // UPDATE FILE API
  describe("PUT /api/repositories/:id/files/:fileId", () => {
    it("preserves all file fields when an oversized update is rejected", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "original.js",
        content: "safe original content",
      });

      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/${created.id}`)
        .send({
          name: "renamed.js",
          content: "x".repeat(1024 * 1024 + 1),
        });

      expect(response.status).toBe(413);

      const storedFile = getFileById(
        repository.id,
        created.id
      );

      expect(storedFile.name).toBe("original.js");
      expect(storedFile.content).toBe("safe original content");
      expect(storedFile.updatedAt).toBe(created.updatedAt);
    });

    it("preserves content when a combined update contains an unsupported filename", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "original.js",
        content: "original content",
      });

      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/${created.id}`)
        .send({
          name: "unsafe.exe",
          content: "modified content",
        });

      expect(response.status).toBe(400);

      const storedFile = getFileById(
        repository.id,
        created.id
      );

      expect(storedFile.name).toBe("original.js");
      expect(storedFile.content).toBe("original content");
      expect(storedFile.updatedAt).toBe(created.updatedAt);
    });

    it("prevents updating a file through another repository", async () => {
      const otherRepository = createRepository({
        name: "Other Repository",
        description: "Repository isolation test",
      });

      const created = createFile({
        repositoryId: repository.id,
        name: "protected.js",
        content: "original content",
      });

      const response = await request(app)
        .put(`/api/repositories/${otherRepository.id}/files/${created.id}`)
        .send({
          content: "unauthorized modification",
        });

      expect(response.status).toBe(404);

      const storedFile = getFileById(
        repository.id,
        created.id
      );

      expect(storedFile.content).toBe("original content");
      expect(storedFile.repositoryId).toBe(repository.id);
    });

    it("rejects attempts to change a file's repository ID", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "original.js",
        content: "original content",
      });

      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/${created.id}`)
        .send({
          content: "modified content",
          repositoryId: "unauthorized-repository",
        });

      expect(response.status).toBe(400);

      expect(response.body.error).toBe(
        "File request contains unsupported fields."
      );

      const storedFile = getFileById(
        repository.id,
        created.id
      );

      expect(storedFile.repositoryId).toBe(repository.id);
      expect(storedFile.content).toBe("original content");
    });

    it("rejects attempts to modify server-managed timestamps", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "original.js",
        content: "original content",
      });

      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/${created.id}`)
        .send({
          content: "modified content",
          updatedAt: "2000-01-01T00:00:00.000Z",
        });

      expect(response.status).toBe(400);

      const storedFile = getFileById(
        repository.id,
        created.id
      );

      expect(storedFile.content).toBe("original content");
      expect(storedFile.updatedAt).toBe(created.updatedAt);
    });

    it("accepts updates containing only permitted fields", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "original.js",
        content: "old content",
      });

      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/${created.id}`)
        .send({
          name: "updated.js",
          content: "new content",
        });

      expect(response.status).toBe(200);
      expect(response.body.file.name).toBe("updated.js");
      expect(response.body.file.content).toBe("new content");

      expect(response.body.file.id).toBe(created.id);
      expect(response.body.file.repositoryId).toBe(repository.id);
    });

    it("rejects unsupported content types without modifying files", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "original.js",
        content: "original content",
      });

      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/${created.id}`)
        .set("Content-Type", "text/plain")
        .send("new content");

      expect(response.status).toBe(415);
      const storedFile = getFileById(repository.id, created.id);
      expect(storedFile.content).toBe("original content");
    });

    it("rejects invalid update body structures", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "original.js",
        content: "original content",
      });

      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/${created.id}`)
        .send([
          {
            content: "modified content",
          },
        ]);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "File API request body must be a JSON object."
      );
      const storedFile = getFileById(repository.id, created.id);
      expect(storedFile.content).toBe("original content");
    });

    it("rejects malformed JSON without changing an existing file", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "original.js",
        content: "safe content",
      });

      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/${created.id}`)
        .set("Content-Type", "application/json")
        .send('{"content":');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid JSON request body.");
      const storedFile = getFileById(repository.id, created.id);
      expect(storedFile.content).toBe("safe content");
    });

    it("rejects renaming a file to an unsupported extension", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "original.js",
        content: "original content",
      });

      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/${created.id}`)
        .send({
          name: "unsafe.exe",
        });

      expect(response.status).toBe(400);

      const storedFile = getFileById(
        repository.id,
        created.id
      );

      expect(storedFile.name).toBe("original.js");
    });

    it("rejects oversized updates without changing stored content", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "existing.js",
        content: "safe original content",
      });

      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/${created.id}`)
        .send({
          content: "x".repeat(1024 * 1024 + 1),
        });

      expect(response.status).toBe(413);

      const storedFile = getFileById(
        repository.id,
        created.id
      );

      expect(storedFile.content).toBe("safe original content");
    });
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


    it("rejects control characters when renaming a file", async () => {
      const created = createFile({
        repositoryId: repository.id,
        name: "original.js",
      });

      const response = await request(app)
        .put(`/api/repositories/${repository.id}/files/${created.id}`)
        .send({ name: "invalid\nname.js" });

      expect(response.status).toBe(400);
      expect(getFileById(repository.id, created.id).name).toBe("original.js");
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

  // DELETE FILE API
  describe("DELETE /api/repositories/:id/files/:fileId", () => {
    it("prevents deleting a file through another repository", async () => {
      const otherRepository = createRepository({
        name: "Other Repository",
        description: "Repository deletion isolation test",
      });

      const created = createFile({
        repositoryId: repository.id,
        name: "protected.js",
        content: "important content",
      });

      const response = await request(app)
        .delete(`/api/repositories/${otherRepository.id}/files/${created.id}`);

      expect(response.status).toBe(404);

      const storedFile = getFileById(
        repository.id,
        created.id
      );

      expect(storedFile).not.toBeNull();
      expect(storedFile.content).toBe("important content");
    });

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
