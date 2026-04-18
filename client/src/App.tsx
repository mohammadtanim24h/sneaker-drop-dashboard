import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDrops, reserveDrop } from "./api";
import { socket } from "./socket";
import { DropCard } from "./components/DropCard";

export default function App() {
    const qc = useQueryClient();

    const { data = [] } = useQuery({
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

    return (
        <div>
            <h1>Sneaker Drops</h1>
            {data.map((drop) => (
                <DropCard key={drop.id} drop={drop} onReserve={reserveDrop} />
            ))}
        </div>
    );
}
