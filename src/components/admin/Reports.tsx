'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

export function Reports() {
    return (
        <div className="bg-gray-50 dark:bg-zinc-900 p-4">
            <header className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-foreground">View Reports</h1>
            </header>
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Attendance Report</CardTitle>
                        <CardDescription>A summary of today's attendance records.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Attendance Summary</CardTitle>
                        <CardDescription>An overview of attendance for the current month.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button>
                            <Download className="mr-2 h-4 w-4" />
                            Download CSV
                        </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Fraud Report</CardTitle>
                        <CardDescription>A log of all fraudulent check-in attempts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
