import { prisma } from "../lib/prisma.js";
import { io } from "../server.js";

export function startReleaseDropsJob() {
    const run = async () => {
        try {
            console.log("[ReleaseDrops] Checking for drops to release...");
            const upcomingDrops = await prisma.drop.findMany({
                where: {
                    status: "UPCOMING",
                    releaseAt: { lte: new Date() },
                },
                select: {
                    id: true,
                    sneaker: {
                        select: {
                            name: true,
                            brand: true,
                        },
                    },
                },
            });

            if (upcomingDrops.length > 0) {
                console.log(`[ReleaseDrops] Found ${upcomingDrops.length} drop(s) ready to release`);
            }

            for (const drop of upcomingDrops) {
                const updated = await prisma.drop.update({
                    where: { id: drop.id },
                    data: { status: "LIVE" },
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
                    },
                });

                console.log(
                    `[ReleaseDrops] Drop ${drop.id} (${drop.sneaker.name} ${drop.sneaker.brand}) is now LIVE`,
                );

                io.emit("drop:update", updated);
                console.log(`[ReleaseDrops] Emitted socket update for drop ${drop.id}`);
            }
        } catch (error) {
            console.error("[ReleaseDrops] Error releasing drops:", error);
        } finally {
            setTimeout(run, 5000);
        }
    };

    console.log("[ReleaseDrops] Starting release drops job (runs every 5 seconds)");
    run();
}
