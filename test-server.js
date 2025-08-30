import express from "express";

const app = express();
const PORT = 5001;

app.get("/", (req, res) => {
  res.send("Test server running!");
});

app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});
