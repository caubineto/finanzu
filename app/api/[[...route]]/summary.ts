import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { subDays, parse, differenceInDays } from "date-fns";
import { and, desc, eq, gte, lt, lte, sql, sum } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { calculatePercentageChange, fillMissingDays } from "@/lib/utils";
import { accounts, categories, transactions } from "@/db/schema";

const app = new Hono()
    .get(
        "/",
        clerkMiddleware(),
        zValidator(
            "query",
            z.object({
                from: z.string().optional(),
                to: z.string().optional(),
                accountId: z.string().optional(),
            }),
        ),
        async (c) => {
            const auth = getAuth(c);
            const { from, to, accountId } = c.req.valid("query");

            if (!auth?.userId) {
                return c.json({ error: "Sem autorização" }, 401);
            }

            const defaultTo = new Date();
            const defaultFrom = subDays(defaultTo, 30);

            const startDate = from
                ? parse(from, "dd-MM-yyyy", new Date())
                : defaultFrom;
            const endDate = to
                ? parse(to, "dd-MM-yyyy", new Date())
                : defaultTo;

            const periodLength = differenceInDays(endDate, startDate) + 1;
            const lastPeriodStart = subDays(startDate, periodLength);
            const lastperiodEnd = subDays(endDate, periodLength);

            async function fetchFinancialData(
                userId: string,
                startDate: Date,
                endDate: Date,
            ) {
                return await db
                    .select({
                        income: sql`SUM(CASE WHEN ${transactions.amount} >= 0 THEN ${transactions.amount} ELSE 0 END)`.mapWith(Number),
                        expenses: sql`SUM(CASE WHEN ${transactions.amount} < 0 THEN ${transactions.amount} ELSE 0 END)`.mapWith(Number),
                        remaining: sum(transactions.amount).mapWith(Number),
                    })
                    .from(transactions)
                    .innerJoin(
                        accounts,
                        eq(
                            transactions.accountId,
                            accounts.id,
                        ),
                    )
                    .where(
                        and(
                            accountId ? eq(transactions.accountId, accountId) : undefined,
                            eq(accounts.userId, userId),
                            gte(transactions.date, startDate),
                            lte(transactions.date, endDate),
                        )
                    );
            };

            const [currentPeriod] = await fetchFinancialData(
                auth.userId,
                startDate,
                endDate,
            );
            const [lastperiod] = await fetchFinancialData(
                auth.userId,
                lastPeriodStart,
                lastperiodEnd,
            );

            const incomeChange = calculatePercentageChange(
                currentPeriod.income,
                lastperiod.income,
            );
            const expansesChange = calculatePercentageChange(
                currentPeriod.expenses,
                lastperiod.expenses,
            );
            const remainingChange = calculatePercentageChange(
                currentPeriod.remaining,
                lastperiod.remaining,
            );

            const category = await db
                .select({
                    name: categories.name,
                    value: sql`SUM(ABS(${transactions.amount}))`.mapWith(Number),
                })
                .from(transactions)
                .innerJoin(
                    accounts,
                    eq(
                        transactions.accountId,
                        accounts.id,
                    ),
                )
                .innerJoin(
                    categories,
                    eq(
                        transactions.categoryId,
                        categories.id,
                    )
                )
                .where(
                    and(
                        accountId ? eq(transactions.accountId, accountId) : undefined,
                        eq(accounts.userId, auth.userId),
                        lt(transactions.amount, 0),
                        gte(transactions.date, startDate),
                        lte(transactions.date, endDate),
                    )
                )
                .groupBy(categories.name)
                .orderBy(desc(
                    sql`SUM(ABS(${transactions.amount}))`
                ));

            const topCategories = category.slice(0, 3);
            const otherCategories = category.slice(3);
            const otherSum = otherCategories
                .reduce((sum, current) => sum + current.value, 0);

            const finalCategories = topCategories;
            if (otherCategories.length > 0) {
                finalCategories.push({
                    name: "Outros",
                    value: otherSum,
                });
            }

            const activeDays = await db
                .select({
                    date: transactions.date,
                    income: sql`SUM(CASE WHEN ${transactions.amount} >= 0 THEN ${transactions.amount} ELSE 0 END)`.mapWith(Number),
                    expenses: sql`SUM(CASE WHEN ${transactions.amount} < 0 THEN ${transactions.amount} ELSE 0 END)`.mapWith(Number),
                })
                .from(transactions)
                .innerJoin(
                    accounts,
                    eq(
                        transactions.accountId,
                        accounts.id,
                    ),
                )
                .where(
                    and(
                        accountId ?
                            eq(transactions.accountId, accountId) : undefined,
                        eq(accounts.userId, auth.userId),
                        gte(transactions.date, startDate),
                        lte(transactions.date, endDate),
                    )
                )
                .groupBy(transactions.date)
                .orderBy(transactions.date);

            const days = fillMissingDays(
                activeDays,
                startDate,
                endDate,
            );

            return c.json({
                data: {
                    remainingAmount: currentPeriod.remaining,
                    remainingChange,
                    incomeAmount: currentPeriod.income,
                    incomeChange,
                    expensesAmount: currentPeriod.expenses,
                    expansesChange,
                    categories: finalCategories,
                    days,
                },
            });
        },
    );

export default app;