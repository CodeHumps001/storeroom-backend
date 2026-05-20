import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";

//1: create a category
const createCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });
    }
    const { name } = req.body;
    const category = await prisma.category.create({
      data: {
        name,
        organizationId: req.user.organizationId,
      },
    });

    res.status(201).json({
      status: "success",
      message: "category created successfuly",
      data: category,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ status: "failed", message: "Something went wrong" });
  }
};

//2: get all category
const getCategories = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });
    }
    const categories = await prisma.category.findMany({
      where: { organizationId: req.user.organizationId },
    });

    res.status(200).json({ status: "success", data: categories });
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

//3: deleteCategory
const deleteCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });
    }
    const { id } = req.params as { id: string };

    const deleteCat = await prisma.category.delete({
      where: { id, organizationId: req.user.organizationId },
    });
    res
      .status(200)
      .json({
        status: "success",
        message: "category deleted successfuly",
        data: deleteCat,
      });
  } catch (err: any) {
    return res.status(500).json({ status: "failed", message: err.message });
  }
};

export default { createCategory, getCategories, deleteCategory };
