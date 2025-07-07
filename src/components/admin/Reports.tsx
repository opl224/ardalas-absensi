'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

export function Reports() {
    return (
        <div className="bg-gray-50 dark:bg-zinc-900">
            <header className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <h1 className="text-xl font-bold text-foreground">Lihat Laporan</h1>
            </header>
            <div className="p-4 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Laporan Kehadiran Harian</CardTitle>
                        <CardDescription>Ringkasan catatan kehadiran hari ini.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button>
                            <Download className="mr-2 h-4 w-4" />
                            Unduh PDF
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Ringkasan Kehadiran Bulanan</CardTitle>
                        <CardDescription>Gambaran kehadiran untuk bulan ini.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button>
                            <Download className="mr-2 h-4 w-4" />
                            Unduh CSV
                        </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Laporan Penipuan</CardTitle>
                        <CardDescription>Catatan semua upaya check-in yang curang.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button>
                            <Download className="mr-2 h-4 w-4" />
                            Unduh PDF
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
