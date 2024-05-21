"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNewAccount } from "@/features/accounts/hooks/use-new-account";
import { Plus } from "lucide-react";
import { Payment, columns } from "./columns";
import { DataTable } from "@/components/data-table";

const data: Payment[] = [
    {
        id: "728ed52f",
        amount: 100,
        status: "Pendente",
        email: "e@example.com",
    },
    {
        id: "728ed52f",
        amount: 50,
        status: "Sucesso",
        email: "a@example.com",
    },
];

const AccountsPage = () => {
    const NewAccount = useNewAccount();

    return (
        <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
            <Card className="border-none drop-shadow-sm">
                <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
                    <CardTitle className="text-xl line-clamp-1">
                        Contas
                    </CardTitle>
                    <Button onClick={NewAccount.onOpen} size="sm">
                        <Plus className="size-4 mr-2" />
                        Adicionar
                    </Button>
                </CardHeader>
                <CardContent>
                    <DataTable                                    
                        filterKey="emails"
                        columns={columns}
                        data={data}
                        onDelete={() => {}}
                        disabled={false}
                    />
                </CardContent>
            </Card>

        </div>
    );
};

export default AccountsPage;