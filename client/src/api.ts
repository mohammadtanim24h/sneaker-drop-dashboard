import { type Drop, type User } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function fetchDrops(): Promise<Drop[]> {
    const res = await fetch(`${API_BASE}/drops/active`);
    return res.json();
}

export async function fetchUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`);
    return res.json();
}

const getUserId = () => localStorage.getItem("userId") ?? "";

export async function reserveDrop(dropId: string) {
    await fetch(`${API_BASE}/drops/${dropId}/reserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getUserId() }),
    });
}

export const saveUserId = (userId: string) => {
    localStorage.setItem("userId", userId);
};

export const getUserIdFromStorage = () => {
    return localStorage.getItem("userId");
};
