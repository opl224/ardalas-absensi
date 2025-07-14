
'use client'

import { ArrowLeft, Shield, Eye, Database, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "../ui/button";

const PrivacyRow = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
    <div className="flex items-start gap-4 py-4">
        <Icon className="h-6 w-6 text-muted-foreground mt-1" />
        <div>
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    </div>
);

export function Privacy({ onBack }: { onBack: () => void }) {
    return (
        <div className="bg-gray-50 dark:bg-zinc-900">
            <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <h1 className="text-xl font-bold text-foreground">Privasi</h1>
            </header>

            <div className="p-4">
                <div className="text-center mb-8">
                    <Shield className="h-12 w-12 text-primary mx-auto mb-2" />
                    <h2 className="text-2xl font-bold">Privasi & Keamanan</h2>
                    <p className="text-muted-foreground">Pengaturan privasi dan data Anda</p>
                </div>

                <Card>
                    <CardContent className="p-4 pt-2">
                        <h3 className="font-semibold text-lg my-2">Privasi Data</h3>
                        <Separator />
                        <div className="divide-y divide-border">
                            <PrivacyRow 
                                icon={Eye} 
                                title="Pengumpulan Data" 
                                description="Kami mengumpulkan data kehadiran, informasi lokasi, dan foto hanya untuk tujuan verifikasi." 
                            />
                            <PrivacyRow 
                                icon={Database} 
                                title="Penyimpanan Data" 
                                description="Data Anda disimpan dan dienkripsi dengan aman. Kami tidak membagikan informasi pribadi Anda dengan pihak ketiga." 
                            />
                            <PrivacyRow 
                                icon={Lock} 
                                title="Keamanan Data" 
                                description="Semua transmisi data dienkripsi menggunakan protokol keamanan standar industri." 
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
