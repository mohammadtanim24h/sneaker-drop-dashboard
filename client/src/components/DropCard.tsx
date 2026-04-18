import { useState, useTransition } from "react";
import { type Drop } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Spinner } from "./ui/spinner";

interface DropCardProps {
    drop: Drop;
    onReserve: (id: string) => void | Promise<void>;
}

export function DropCard({ drop, onReserve }: DropCardProps) {
    const [isPending, startTransition] = useTransition();
    const isLowStock = drop.availableStock <= 5;
    const isOutOfStock = drop.availableStock === 0;

    const handleReserve = () => {
        startTransition(async () => {
            await onReserve(drop.id);
        });
    };

    return (
        <Card className="group overflow-hidden transition-all hover:shadow-lg py-0 gap-2">
            <CardHeader className="p-0">
                <div className="relative aspect-4/3 bg-muted overflow-hidden">
                    <img
                        src={
                            drop.sneaker.imageUrl
                                ? drop.sneaker.imageUrl
                                : "https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/b44b7252-37f0-4a55-9b13-f0938e4d6b74/WMNS+AIR+FORCE+1+%2707.png"
                        }
                        alt={drop.sneaker.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <span className="text-xl font-semibold text-white">
                                Sold Out
                            </span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            {drop.sneaker.brand}
                        </p>
                        <CardTitle className="mt-1 text-lg line-clamp-2">
                            {drop.sneaker.name}
                        </CardTitle>
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <Badge
                        variant={isLowStock ? "destructive" : "secondary"}
                        className="text-sm px-2.5 py-0.5"
                    >
                        {isOutOfStock
                            ? "Out of Stock"
                            : `${drop.availableStock} available`}
                    </Badge>
                    {drop.soldStock > 0 && (
                        <Badge
                            variant="outline"
                            className="text-sm px-2.5 py-0.5"
                        >
                            {drop.soldStock} sold
                        </Badge>
                    )}
                </div>
                {drop.purchases.length > 0 && (
                    <div className="mt-4">
                        <p className="text-sm font-medium text-muted-foreground mb-1.5">
                            Purchased by
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {drop.purchases.map((p) => (
                                <Badge
                                    key={p.id}
                                    variant="outline"
                                    className="text-sm font-normal"
                                >
                                    {p.user.username}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
                <Button
                    onClick={handleReserve}
                    disabled={isOutOfStock || isPending}
                    className="w-full mt-4 text-base cursor-pointer"
                    size="default"
                >
                    {isPending ? (
                        <span className="flex items-center gap-2">
                            <Spinner />
                            Processing...
                        </span>
                    ) : isOutOfStock ? (
                        "Sold Out"
                    ) : (
                        "Reserve Now"
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
