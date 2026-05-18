require("dotenv").config();
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Storeroom server listening on port ${PORT}`);
  console.log(`Keep building the future`);
});

module.exports = app;
