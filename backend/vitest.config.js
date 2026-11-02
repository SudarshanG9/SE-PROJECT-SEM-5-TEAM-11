const path = require("node:path");

module.exports = {
  test: {
    setupFiles: ["./vitest.setup.js"],
    environment: "node",
  },
};