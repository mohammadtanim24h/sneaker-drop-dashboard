import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { io } from "../server.js";

/**
 * Get all active drops (status: LIVE)
 */
export const getActiveDrops = async (_req: Request, res: Response) => {
    const drops = await prisma.drop.findMany({
        where: { status: "LIVE" },
        include: {
            sneaker: true,
            purchases: {
                take: 3,
                orderBy: { createdAt: "desc" },
                include: { user: true },
            },
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

/**
 * Reserve a drop
 */
export const reserve = async (
    req: Request<
        { dropId: string },
        {},
        {
            userId: string;
        }
    >,
    res: Response,
) => {
    const { dropId } = req.params;
    const { userId } = req.body;

    try {
        const reservation = await prisma.$transaction(async (tx) => {
            const updated = await tx.drop.updateMany({
                where: { id: dropId, availableStock: { gt: 0 } },
                data: {
                    availableStock: { decrement: 1 },
                    reservedStock: { increment: 1 },
                },
            });

            if (!updated.count) throw new Error("Sold out");

            return tx.reservation.create({
                data: {
                    dropId,
                    userId,
                    expiresAt: new Date(Date.now() + 60000),
                },
            });
        });

        io.emit("drop:update");
        res.json(reservation);
    } catch {
        res.status(409).json({ message: "Sold out" });
    }
};

/**
 * Purchase a reserved drop
 */
export const purchase = async (
    req: Request<
        { reservationId: string },
        {},
        {
            userId: string;
        }
    >,
    res: Response,
) => {
    const { reservationId } = req.params;
    const { userId } = req.body;

    try {
        const purchase = await prisma.$transaction(async (tx) => {
            const reservation = await tx.reservation.findFirst({
                where: { id: reservationId, userId, status: "ACTIVE" },
            });

            if (!reservation) throw new Error("Invalid reservation");

            await tx.reservation.update({
                where: { id: reservationId },
                data: { status: "COMPLETED" },
            });

            await tx.drop.update({
                where: { id: reservation.dropId },
                data: {
                    reservedStock: { decrement: 1 },
                    soldStock: { increment: 1 },
                },
            });

            return tx.purchase.create({
                data: {
                    dropId: reservation.dropId,
                    userId,
                    reservationId,
                },
            });
        });

        io.emit("drop:update");
        res.json(purchase);
    } catch {
        res.status(409).json({ message: "Purchase failed" });
    }
};
