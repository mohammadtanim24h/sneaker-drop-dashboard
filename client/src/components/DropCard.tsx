import { type Drop } from "../types";

interface DropCardProps {
    drop: Drop;
    onReserve: (id: string) => void;
}

export function DropCard({ drop, onReserve }: DropCardProps) {
    return (
        <div style={{ border: "1px solid #ccc", padding: 12 }}>
            <h3>{drop.sneaker.name}</h3>
            <p>Stock: {drop.availableStock}</p>
            <button onClick={() => onReserve(drop.id)}>Reserve</button>

            <ul>
                {drop.purchases.map((p) => (
                    <li key={p.id}>{p.user.username}</li>
                ))}
            </ul>
        </div>
    );
}
