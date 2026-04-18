import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

/**
 * Get all active drops (status: LIVE)
 */
export const getActiveDrops = async (_req: Request, res: Response) => {
    const drops = await prisma.drop.findMany({
        where: { status: "LIVE" },
        include: {
            sneaker: true,
        },
    });

    res.json(drops);
};

/**
 * Create a new drop
 */
export const createDrop = async (req: Request, res: Response) => {
    const { name, brand, stock, price } = req.body as {
        name: string;
        brand: string;
        stock: number;
        price: number;
    };

    const sneaker = await prisma.sneaker.create({ data: { name, brand } });

    const drop = await prisma.drop.create({
        data: {
            sneakerId: sneaker.id,
            totalStock: stock,
            availableStock: stock,
            retailPrice: price,
            releaseAt: new Date(),
            status: "LIVE",
        },
    });

    res.json(drop);
};
