import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { io } from "../server.js";

/**
 * Get all active drops (status: LIVE)
 */
export const getActiveDrops = async (_req: Request, res: Response) => {
    console.log("[getActiveDrops] Fetching all LIVE drops");

    const drops = await prisma.drop.findMany({
        where: { status: "LIVE" },
        select: {
            id: true,
            availableStock: true,
            soldStock: true,
            retailPrice: true,
            sneaker: {
                select: {
                    name: true,
                    brand: true,
                    imageUrl: true,
                },
            },
            purchases: {
                take: 3,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    user: {
                        select: {
                            username: true,
                        },
                    },
                },
            },
        },
    });

    console.log(`[getActiveDrops] Found ${drops.length} active drops`);
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

    console.log(`[createDrop] Creating drop for sneaker: ${name} (${brand})`);

    // Create sneaker record first
    const sneaker = await prisma.sneaker.create({ data: { name, brand } });

    // Create the drop with initial stock values
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

    console.log(`[createDrop] Drop created successfully with ID: ${drop.id}`);
    res.json(drop);
};

/**
 * Reserve a drop (holds stock for 60 seconds)
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

    console.log(
        `[reserve] User ${userId} attempting to reserve drop ${dropId}`,
    );

    try {
        const reservation = await prisma.$transaction(async (tx) => {
            // Decrement available stock, increment reserved stock
            const updated = await tx.drop.updateMany({
                where: { id: dropId, availableStock: { gt: 0 } },
                data: {
                    availableStock: { decrement: 1 },
                    reservedStock: { increment: 1 },
                },
            });

            // No rows updated means no stock available
            if (!updated.count) throw new Error("Sold out");

            // Create reservation with 60 second expiry
            return tx.reservation.create({
                data: {
                    dropId,
                    userId,
                    expiresAt: new Date(Date.now() + 60000),
                },
            });
        });

        console.log(`[reserve] Reservation created: ${reservation.id}`);
        io.emit("drop:update");
        res.json(reservation);
    } catch (err) {
        console.log(`[reserve] Failed: ${(err as Error).message}`);
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

    console.log(
        `[purchase] User ${userId} purchasing with reservation ${reservationId}`,
    );

    try {
        const purchase = await prisma.$transaction(async (tx) => {
            // Find valid active reservation for this user
            const reservation = await tx.reservation.findFirst({
                where: { id: reservationId, userId, status: "ACTIVE" },
            });

            if (!reservation) throw new Error("Invalid reservation");

            // Mark reservation as completed
            await tx.reservation.update({
                where: { id: reservationId },
                data: { status: "COMPLETED" },
            });

            // Move stock from reserved to sold
            await tx.drop.update({
                where: { id: reservation.dropId },
                data: {
                    reservedStock: { decrement: 1 },
                    soldStock: { increment: 1 },
                },
            });

            // Create purchase record
            return tx.purchase.create({
                data: {
                    dropId: reservation.dropId,
                    userId,
                    reservationId,
                },
            });
        });

        console.log(`[purchase] Purchase completed: ${purchase.id}`);
        io.emit("drop:update");
        res.json(purchase);
    } catch (err) {
        console.log(`[purchase] Failed: ${(err as Error).message}`);
        res.status(409).json({ message: "Purchase failed" });
    }
};
