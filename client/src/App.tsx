import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./components/ui/select";
import { Button } from "./components/ui/button";
import {
    fetchDrops,
    fetchUsers,
    reserveDrop,
    purchaseDrop,
    getUserIdFromStorage,
    saveUserId,
} from "./api";
import { socket } from "./socket";
import { DropCard } from "./components/DropCard";
import { Spinner } from "./components/ui/spinner";
import { toast } from "sonner";
import { type Drop, type DropUpdate } from "./types";

export default function App() {
    const qc = useQueryClient();
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [showUserDialog, setShowUserDialog] = useState(false);
    const storedUserId = getUserIdFromStorage();

    const { data = [], isLoading } = useQuery({
        queryKey: ["drops"],
        queryFn: fetchDrops,
    });

    const { data: users = [], isLoading: usersLoading } = useQuery({
        queryKey: ["users"],
        queryFn: fetchUsers,
    });

    useEffect(() => {
        if (!storedUserId) {
            setShowUserDialog(true);
        }
    }, [storedUserId]);

    useEffect(() => {
        // Listen for single drop updates (e.g. reservation or purchase)
        socket.on("drop:update", (update: DropUpdate) => {
            qc.setQueryData<Drop[]>(["drops"], (oldDrops = []) => {
                return oldDrops.map((drop) =>
                    drop.id === update.id
                        ? {
                              ...drop,
                              ...(update.availableStock !== undefined && {
                                  availableStock: update.availableStock,
                              }),
                              ...(update.soldStock !== undefined && {
                                  soldStock: update.soldStock,
                              }),
                              ...(update.purchases !== undefined && {
                                  purchases: update.purchases,
                              }),
                              ...(update.reservations !== undefined && {
                                  reservations: update.reservations,
                              }),
                          }
                        : drop,
                );
            });
        });

        // Listen for bulk drop updates (e.g. after reservation expiry job)
        socket.on("drops:update", (updates: DropUpdate[]) => {
            qc.setQueryData<Drop[]>(["drops"], (oldDrops = []) => {
                const updateMap = new Map(updates.map((u) => [u.id, u]));
                return oldDrops.map((drop) =>
                    updateMap.has(drop.id)
                        ? { ...drop, ...updateMap.get(drop.id)! }
                        : drop,
                );
            });
        });

        return () => {
            socket.off("drop:update");
        };
    }, [qc]);

    const handlePurchase = async (dropId: string) => {
        const drop = data.find((d) => d.id === dropId);
        if (!drop) {
            toast.error("Drop not found");
            return;
        }

        const reservation = drop.reservations.find(
            (r) => r.user.id === storedUserId,
        );
        if (!reservation) {
            toast.error("No active reservation found");
            return;
        }

        try {
            const resp = await purchaseDrop(reservation.id);
            if (resp.status !== 200) {
                toast.error("Failed to purchase sneaker. Please try again.");
            } else {
                toast.success("Sneaker purchased successfully!");
            }
        } catch {
            toast.error("Failed to purchase sneaker. Please try again.");
        }
    };

    const handleReserve = async (dropId: string) => {
        try {
            const resp = await reserveDrop(dropId);
            if (resp.status !== 200) {
                toast.error("Failed to reserve sneaker. Please try again.");
            } else {
                toast.success("Sneaker reserved successfully!");
            }
        } catch {
            toast.error("Failed to reserve sneaker. Please try again.");
        }
    };

    const handleUserSelect = () => {
        if (selectedUserId) {
            saveUserId(selectedUserId);
            setShowUserDialog(false);
        }
    };

    return (
        <>
            <Dialog open={showUserDialog}>
                <DialogContent className="sm:max-w-md" showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>Select Your Profile</DialogTitle>
                        <DialogDescription>
                            Choose your user profile to continue with
                            reservations.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                        <Select
                            value={selectedUserId}
                            onValueChange={setSelectedUserId}
                            disabled={usersLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a user..." />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.username}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={handleUserSelect}
                            disabled={!selectedUserId || usersLoading}
                            className="text-base cursor-pointer"
                        >
                            Proceed
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="max-w-7xl mx-auto p-5">
                <h1 className="text-4xl mb-3">Sneaker Drops</h1>
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Spinner className="size-8" />
                    </div>
                ) : data.length === 0 ? (
                    <p className="text-lg">No drops available.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                        {data.map((drop) => (
                            <DropCard
                                key={drop.id}
                                drop={drop}
                                onReserve={handleReserve}
                                onPurchase={handlePurchase}
                                currentUserId={storedUserId}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
