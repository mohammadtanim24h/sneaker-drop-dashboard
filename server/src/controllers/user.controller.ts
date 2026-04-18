import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getAllUsers = async (_req: Request, res: Response) => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            username: true,
        },
    });
    res.json(users);
};
