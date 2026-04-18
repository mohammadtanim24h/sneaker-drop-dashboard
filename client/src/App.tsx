import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDrops, reserveDrop } from "./api";
import { socket } from "./socket";
import { DropCard } from "./components/DropCard";
import { Spinner } from "./components/ui/spinner";
import { toast } from "sonner";

export default function App() {
    const qc = useQueryClient();

    const { data = [], isLoading } = useQuery({
        queryKey: ["drops"],
        queryFn: fetchDrops,
    });

    useEffect(() => {
        socket.on("drop:update", () => {
            qc.invalidateQueries({ queryKey: ["drops"] });
        });

        return () => {
            socket.off("drop:update");
        };
    }, [qc]);

    const handleReserve = async (dropId: string) => {
        try {
            await reserveDrop(dropId);
            toast.success("Sneaker reserved successfully!");
        } catch {
            toast.error("Failed to reserve sneaker. Please try again.");
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-5">
            <h1 className="text-4xl mb-3">Sneaker Drops</h1>
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Spinner className="size-8" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                    {data.map((drop) => (
                        <DropCard
                            key={drop.id}
                            drop={drop}
                            onReserve={handleReserve}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
