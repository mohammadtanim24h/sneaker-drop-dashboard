import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
    // 1. Create Users
    const users = await Promise.all([
        prisma.user.create({ data: { username: "tanim" } }),
        prisma.user.create({ data: { username: "alex" } }),
        prisma.user.create({ data: { username: "sarah" } }),
        prisma.user.create({ data: { username: "john" } }),
    ]);

    // 2. Create Sneaker
    const sneaker = await prisma.sneaker.create({
        data: {
            name: "Air Jordan 1",
            brand: "Nike",
            imageUrl: "https://via.placeholder.com/150",
        },
    });

    // 3. Create Drop
    const drop = await prisma.drop.create({
        data: {
            sneakerId: sneaker.id,
            totalStock: 50,
            availableStock: 48,
            reservedStock: 3,
            soldStock: 2,
            retailPrice: 200,
            releaseAt: new Date(),
            status: "LIVE",
        },
    });

    // 4. Create Reservations (some active, some completed)
    const reservation1 = await prisma.reservation.create({
        data: {
            dropId: drop.id,
            userId: users[0].id,
            status: "COMPLETED",
            expiresAt: new Date(Date.now() + 60000),
        },
    });

    const reservation2 = await prisma.reservation.create({
        data: {
            dropId: drop.id,
            userId: users[1].id,
            status: "COMPLETED",
            expiresAt: new Date(Date.now() + 60000),
        },
    });

    // 5. Create Purchases (for activity feed)
    await prisma.purchase.create({
        data: {
            dropId: drop.id,
            userId: users[0].id,
            reservationId: reservation1.id,
        },
    });

    await prisma.purchase.create({
        data: {
            dropId: drop.id,
            userId: users[1].id,
            reservationId: reservation2.id,
        },
    });

    console.log("Seed data inserted successfully");
}

main()
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    })
    .then(async () => {
        await prisma.$disconnect();
    });
