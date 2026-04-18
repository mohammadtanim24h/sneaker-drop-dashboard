export interface User {
    username: string;
}

export interface Purchase {
    id: string;
    user: User;
}

export interface Sneaker {
    name: string;
    brand: string;
    imageUrl: string | null;
}

export interface Drop {
    id: string;
    availableStock: number;
    sneaker: Sneaker;
    purchases: Purchase[];
}
