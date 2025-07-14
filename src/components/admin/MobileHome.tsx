
'use client';

import { Settings, UserPlus, LineChart, CheckSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "../ui/button";
import { AttendanceSettingsDialog } from "./AttendanceSettingsDialog";
import { useState } from "react";

interface MobileHomeProps {
  setActiveView?: (view: 'users' | 'reports' | 'attendance' | 'privacy', index: number) => void;
}

const QuickActionButton = ({ icon: Icon, title, description, onClick, className }: { icon: React.ElementType, title: string, description: string, onClick?: () => void, className?: string }) => (
    <button onClick={onClick} className="w-full text-left p-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
        <Card className={`hover:bg-secondary/50 transition-colors w-full ${className}`}>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                <div className="bg-primary/10 text-primary p-3 rounded-lg">
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <p className="font-semibold text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </CardHeader>
        </Card>
    </button>
);

export function MobileHome({ setActiveView }: MobileHomeProps) {
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);

    return (
        <div className="bg-gray-50 dark:bg-zinc-900">
             <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <h1 className="text-xl font-bold text-foreground">Beranda Admin</h1>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowSettingsDialog(true)}>
                    <Settings className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">Pengaturan</span>
                </Button>
            </header>

            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8">
                <div className="space-y-4">
                     <QuickActionButton 
                        icon={UserPlus}
                        title="Manajemen Pengguna"
                        description="Kelola data admin dan guru"
                        onClick={() => setActiveView?.('users', 1)}
                     />
                     <div className="grid grid-cols-2 gap-4">
                         <QuickActionButton 
                            icon={LineChart}
                            title="Laporan"
                            description="Lihat laporan"
                            onClick={() => setActiveView?.('reports', 3)}
                         />
                         <QuickActionButton 
                            icon={CheckSquare}
                            title="Kehadiran"
                            description="Pantau kehadiran"
                            onClick={() => setActiveView?.('attendance', 2)}
                         />
                     </div>
                </div>
            </main>

            <AttendanceSettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />
        </div>
    );
}
