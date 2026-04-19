import { prisma } from "../lib/prisma.js";
import { io } from "../server.js";

export function startExpiryJob() {
    let isRunning = false;

    setInterval(async () => {
        if (isRunning) {
            return;
        }

        isRunning = true;

        try {
            const expired = await prisma.reservation.findMany({
                where: {
                    status: "ACTIVE",
                    expiresAt: { lte: new Date() },
                },
            });

            const affectedDropIds = new Set<string>();

            for (const r of expired) {
                await prisma.$transaction(async (tx) => {
                    await tx.reservation.update({
                        where: { id: r.id },
                        data: { status: "EXPIRED" },
                    });

                    await tx.drop.update({
                        where: { id: r.dropId },
                        data: {
                            availableStock: { increment: 1 },
                            reservedStock: { decrement: 1 },
                        },
                    });
                });

                affectedDropIds.add(r.dropId);
            }

            if (affectedDropIds.size > 0) {
                const updatedDrops = await prisma.drop.findMany({
                    where: { id: { in: Array.from(affectedDropIds) } },
                    select: {
                        id: true,
                        availableStock: true,
                        reservations: {
                            where: { status: "ACTIVE" },
                            select: {
                                id: true,
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                    },
                                },
                            },
                        },
                    },
                });

                io.emit("drops:update", updatedDrops);
            }
        } finally {
            isRunning = false;
        }
    }, 5000);
}
