import { prisma } from "../lib/prisma.js";
import { io } from "../server.js";

export function startReleaseDropsJob() {
    let isRunning = false;

    setInterval(async () => {
        if (isRunning) {
            return;
        }

        isRunning = true;

        try {
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
                    `[releaseDrops] Drop ${drop.id} (${drop.sneaker.name} ${drop.sneaker.brand}) is now LIVE`,
                );

                io.emit("drop:update", updated);
            }
        } finally {
            isRunning = false;
        }
    }, 5000);
}
