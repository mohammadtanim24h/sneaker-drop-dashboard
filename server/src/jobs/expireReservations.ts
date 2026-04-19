import { prisma } from "../lib/prisma.js";
import { io } from "../server.js";

export function startExpiryJob() {
    const run = async () => {
        try {
            console.log("[ExpiryJob] Checking for expired reservations...");
            const expired = await prisma.reservation.findMany({
                where: {
                    status: "ACTIVE",
                    expiresAt: { lte: new Date() },
                },
                include: {
                    drop: {
                        select: {
                            id: true,
                            availableStock: true,
                            reservedStock: true,
                            totalStock: true,
                        },
                    },
                },
            });

            if (expired.length > 0) {
                console.log(`[ExpiryJob] Found ${expired.length} expired reservation(s)`);
                // Log drop states before processing
                for (const r of expired) {
                    console.log(`[ExpiryJob] Reservation ${r.id} - Drop ${r.dropId}: available=${r.drop.availableStock}, reserved=${r.drop.reservedStock}, total=${r.drop.totalStock}`);
                }
            }

            const affectedDropIds = new Set<string>();

            for (const r of expired) {
                console.log(`[ExpiryJob] Expiring reservation ${r.id} for drop ${r.dropId}`);
                await prisma.$transaction(async (tx) => {
                    // Verify reservation is still ACTIVE and fetch current drop state
                    const current = await tx.reservation.findUnique({
                        where: { id: r.id },
                        select: { status: true, dropId: true },
                    });

                    if (!current || current.status !== "ACTIVE") {
                        console.log(`[ExpiryJob] Reservation ${r.id} already processed, skipping`);
                        return;
                    }

                    // Verify reservedStock is positive before decrementing
                    const drop = await tx.drop.findUnique({
                        where: { id: current.dropId },
                        select: { reservedStock: true },
                    });

                    if (!drop || drop.reservedStock <= 0) {
                        console.log(`[ExpiryJob] Invalid stock state for drop ${current.dropId}, skipping stock adjustment`);
                        await tx.reservation.update({
                            where: { id: r.id },
                            data: { status: "EXPIRED" },
                        });
                        return;
                    }

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

                // Verify final state
                const finalState = await prisma.drop.findUnique({
                    where: { id: r.dropId },
                    select: { availableStock: true, reservedStock: true, totalStock: true },
                });
                console.log(`[ExpiryJob] After processing - Drop ${r.dropId}: available=${finalState?.availableStock}, reserved=${finalState?.reservedStock}, total=${finalState?.totalStock}`);

                if (finalState && finalState.availableStock > finalState.totalStock) {
                    console.error(`[ExpiryJob] WARNING: availableStock (${finalState.availableStock}) exceeds totalStock (${finalState.totalStock}) for drop ${r.dropId}`);
                }
                if (finalState && finalState.reservedStock < 0) {
                    console.error(`[ExpiryJob] WARNING: reservedStock (${finalState.reservedStock}) is negative for drop ${r.dropId}`);
                }

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
            setTimeout(run, 5000);
        }
    };

    console.log("[ExpiryJob] Starting expiry job (runs every 5 seconds)");
    run();
}
