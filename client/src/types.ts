export interface User {
    id: string;
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
    soldStock: number;
    sneaker: Sneaker;
    purchases: Purchase[];
}

export interface DropUpdate {
    id: string;
    availableStock?: number;
    soldStock?: number;
    purchases?: Purchase[];
}
