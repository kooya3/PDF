import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://pdf-13a39.convex.cloud";

export const convex = new ConvexHttpClient(CONVEX_URL);