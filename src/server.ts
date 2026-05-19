import dotenv from "dotenv";
dotenv.config();
import app from "./app";

const PORT: number = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`Storeroom server listening on port ${PORT}`);
  console.log(`Keep building the future`);
});
