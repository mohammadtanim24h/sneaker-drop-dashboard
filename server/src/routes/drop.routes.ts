import { Router } from "express";
import {
    getActiveDrops,
    createDrop,
    reserve,
    purchase,
} from "../controllers/drop.controller.js";

export const dropRouter = Router();

dropRouter.get("/active", getActiveDrops);
dropRouter.post("/", createDrop);
dropRouter.post("/:dropId/reserve", reserve);
dropRouter.post("/purchase/:reservationId", purchase);
