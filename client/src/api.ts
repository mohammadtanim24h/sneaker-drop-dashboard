import { type Drop } from "./types";

export async function fetchDrops(): Promise<Drop[]> {
    const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/drops/active`,
    );
    return res.json();
}

export async function reserveDrop(dropId: string) {
    await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/drops/${dropId}/reserve`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: "cmo48ykju0000youxkf3c9pzz" }),
        },
    );
}
