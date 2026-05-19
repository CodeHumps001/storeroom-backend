import { Request, Response } from "express";

const getHealth = (req: Request, res: Response): void => {
  res.status(200).json({ status: "ok", message: "Storeroom is healthy" });
};

export default getHealth;
