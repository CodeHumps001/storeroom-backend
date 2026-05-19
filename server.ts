import dotenv from "dotenv";
import express from "express";
dotenv.config();
const app = express();

const PORT: number = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`Storeroom server listening on port ${PORT}`);
  console.log(`Keep building the future`);
});

export default app;
