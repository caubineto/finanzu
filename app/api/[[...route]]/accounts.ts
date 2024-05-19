import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { zValidator } from "@hono/zod-validator"
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";

import { db } from "@/db/drizzle";
import { accounts, insertAccountSchema } from "@/db/schema";

const app = new Hono()
    .get(
        "/",
        clerkMiddleware(),
        async (c) => {
            const auth = getAuth(c);

            if (!auth?.userId) {
                return c.json({ error: "Sem autorização" }, 401)
            }

            const data = await db
                .select({
                    id: accounts.id,
                    name: accounts.name,
                })
                .from(accounts)
                .where(eq(accounts.userId, auth.userId));

            return c.json({ data });
        })
    .post(
        "/",
        clerkMiddleware(),
        zValidator("json", insertAccountSchema.pick({
            name: true,
        })),
        async (c) => {
            const auth = getAuth(c);
            const values = c.req.valid("json");

            if (!auth?.userId) {
                return c.json({ error: "Sem autorização" }, 401);
            }

            const [data] = await db.insert(accounts).values({
                id: createId(),
                userId: auth.userId,
                ...values
            }).returning();


            return c.json({ data });
        });

export default app;