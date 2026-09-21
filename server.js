// Minimal static server for the built site (src/ -> _site/), for Railway.
// Railway sets PORT; we bind to it and 0.0.0.0.
const path = require("path");
const express = require("express");

const app = express();
const DIST = path.join(__dirname, "_site");

app.use(
  express.static(DIST, {
    extensions: ["html"],
  })
);

// 404s: serve a plain fallback rather than Express's default HTML.
app.use((req, res) => {
  res.status(404).sendFile(path.join(DIST, "index.html"));
});

const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`Dealer Flywheel site listening on port ${port}`);
});
