import { Router } from "express";
import { getActiveDrops, createDrop } from "../controllers/drop.controller.js";

export const dropRouter = Router();

dropRouter.get("/active", getActiveDrops);
dropRouter.post("/", createDrop);
