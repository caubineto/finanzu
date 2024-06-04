import { config } from "dotenv";
import { subDays } from "date-fns";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { categories, accounts, transactions } from "@/db/schema";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const SEED_USER_ID = "user_2gerQp3uLlhyIo2LDIpGMyznMpB";
const SEED_CATEGORIES = [
    { id: "category_1", name: "Alimentação", userId: SEED_USER_ID, plaidId: null },
    { id: "category_2", name: "Alguel", userId: SEED_USER_ID, plaidId: null },
    { id: "category_3", name: "Utilidades", userId: SEED_USER_ID, plaidId: null },
    { id: "category_7", name: "Roupas", userId: SEED_USER_ID, plaidId: null },
];

const SEED_ACCOUNTS = [
    { id: "account_1", name: "Carteira", userId: SEED_USER_ID, plaidId: null },
    { id: "account_2", name: "Banco", userId: SEED_USER_ID, plaidId: null },
];

const defaultTo = new Date();
const defaultFrom = subDays(defaultTo, 90);

const SEED_TRANSACTIONS: typeof transactions.$inferSelect[] = [];

import { eachDayOfInterval, format } from "date-fns";
import { convertAmountToMiliunits } from "@/lib/utils";

const generateRandomAmount = (category: typeof categories.$inferSelect) => {
    switch (category.name) {
        case "Aluguel":
            return Math.random() * 400 + 90; //o aluguel provavelmente será um valor maior
        case "Utilidades":
            return Math.random() * 200 + 50;
        case "Alimentação":
            return Math.random() * 30 + 10;
        case "Transporte":
        case "Saúde":
            return Math.random() * 50 + 15;
        case "Entretenimento":
        case "Roupas":
        case "Diversos":
            return Math.random() * 100 + 20;
        default:
            return Math.random() * 50 + 10;
    }
};

const generateTrasanctionForDay = (day: Date) => {
    const numTransactions = Math.floor(Math.random() * 4) + 1;

    for (let i = 0; i < numTransactions; i++) {
        const category = SEED_CATEGORIES[Math.floor(Math.random() * SEED_CATEGORIES.length)];
        const isExpense = Math.random() > 0.6;

        const amount = generateRandomAmount(category);
        const formattedAmount = convertAmountToMiliunits(isExpense ? -amount : amount);

        SEED_TRANSACTIONS.push({
            id: `transaction_${format(day, "dd-MM-yyyy")}_${i}`,
            accountId: SEED_ACCOUNTS[0].id,
            categoryId: category.id,
            date: day,
            amount: formattedAmount,
            payee: "Merchant",
            notes: "Transação aleatória",
        });
    }
};

const generateTransactions = () => {
    const days = eachDayOfInterval({ start: defaultFrom, end: defaultTo });
    days.forEach(day => generateTrasanctionForDay(day));
};

generateTransactions();

const main = async () => {
    try {
        await db.delete(transactions).execute();
        await db.delete(accounts).execute();
        await db.delete(categories).execute();
        //seed categories
        await db.insert(categories).values(SEED_CATEGORIES).execute();
        //seed accounts
        await db.insert(accounts).values(SEED_ACCOUNTS).execute();
        //seed transactions
        await db.insert(transactions).values(SEED_TRANSACTIONS).execute();
    } catch (error) {
        console.error("Erro durante a execução do seed", error);
        process.exit(1);
    }
};