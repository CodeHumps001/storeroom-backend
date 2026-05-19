import { Request, Response } from "express";

const getHealth = (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Storeroom is healthy" });
};

export default getHealth;
