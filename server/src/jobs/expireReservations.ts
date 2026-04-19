import { prisma } from "../lib/prisma.js";
import { io } from "../server.js";

export function startExpiryJob() {
    let isRunning = false;

    console.log("[ExpiryJob] Starting expiry job (runs every 5 seconds)");

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

            if (expired.length > 0) {
                console.log(`[ExpiryJob] Found ${expired.length} expired reservation(s)`);
            }

            const affectedDropIds = new Set<string>();

            for (const r of expired) {
                console.log(`[ExpiryJob] Expiring reservation ${r.id} for drop ${r.dropId}`);
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

                console.log(`[ExpiryJob] Successfully expired reservation ${r.id} and restored stock for drop ${r.dropId}`);
                affectedDropIds.add(r.dropId);
            }

            if (affectedDropIds.size > 0) {
                console.log(`[ExpiryJob] Fetching updates for ${affectedDropIds.size} affected drop(s)`);
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
                console.log(`[ExpiryJob] Emitted socket update for ${updatedDrops.length} drop(s)`);
            }
        } catch (error) {
            console.error("[ExpiryJob] Error processing expired reservations:", error);
        } finally {
            isRunning = false;
        }
    }, 5000);
}
