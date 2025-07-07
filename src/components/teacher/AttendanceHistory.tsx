'use client'

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

// TODO: Ganti dengan data asli dari Firestore
const historyData: any[] = [];

export function AttendanceHistory() {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return <div>Memuat...</div>
  }

    return (
        <div className="bg-gray-50 dark:bg-zinc-900 p-4 min-h-screen">
            <header className="mb-6">
                <h1 className="text-xl font-bold text-foreground">Riwayat Kehadiran</h1>
            </header>

            <div className="space-y-3">
                {historyData.length === 0 && <p className="text-muted-foreground text-center py-8">Belum ada riwayat kehadiran.</p>}
                {historyData.map((item, index) => (
                    <Card key={index} className="p-3 flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={userProfile.avatar} alt={userProfile.name} data-ai-hint="person portrait" />
                            <AvatarFallback>{userProfile.name.slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                            <p className="font-semibold text-foreground">{item.date}</p>
                            <p className="text-sm text-muted-foreground">Masuk: {item.checkIn} | Keluar: {item.checkOut}</p>
                        </div>
                        <Badge variant={
                            item.status === 'Hadir' ? 'default' :
                            item.status === 'Terlambat' ? 'secondary' : 'destructive'
                        } className="w-20 justify-center">{item.status}</Badge>
                    </Card>
                ))}
            </div>
        </div>
    );
}
