const http = require("http");

require("../server.js");

const PORT = process.env.PORT || 5000;

const waitForServer = () =>
  new Promise((resolve) => {
    const tryConnect = () => {
      http
        .get(`http://localhost:${PORT}/api/health`, (res) => {
          res.resume();
          if (res.statusCode === 200) resolve();
          else setTimeout(tryConnect, 400);
        })
        .on("error", () => setTimeout(tryConnect, 400));
    };
    tryConnect();
  });

const START = Date.now();

waitForServer()
  .then(() => {
    console.log(`Server ready after ${Date.now() - START}ms on http://localhost:${PORT}\n`);
    require("./smoke.js");
  })
  .catch((error) => {
    console.error("Failed to boot server for e2e test:", error.message);
    process.exit(1);
  });