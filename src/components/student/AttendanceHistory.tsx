'use client'

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AttendanceHistoryProps {
  user: {
    name: string;
    avatar: string;
  };
}

const historyData = [
  { date: '7 Juli 2025', checkIn: '08:01 AM', checkOut: '03:30 PM', status: 'Hadir' },
  { date: '6 Juli 2025', checkIn: '08:03 AM', checkOut: '03:32 PM', status: 'Hadir' },
  { date: '5 Juli 2025', checkIn: '08:15 AM', checkOut: '03:25 PM', status: 'Terlambat' },
  { date: '4 Juli 2025', checkIn: '-', checkOut: '-', status: 'Absen' },
  { date: '3 Juli 2025', checkIn: '08:00 AM', checkOut: '03:30 PM', status: 'Hadir' },
  { date: '2 Juli 2025', checkIn: '09:00 AM', checkOut: '03:31 PM', status: 'Penipuan' },
];

export function AttendanceHistory({ user }: AttendanceHistoryProps) {
    return (
        <div className="bg-gray-50 dark:bg-zinc-900 p-4 min-h-screen">
            <header className="mb-6">
                <h1 className="text-xl font-bold text-foreground">Riwayat Kehadiran</h1>
            </header>

            <div className="space-y-3">
                {historyData.map((item, index) => (
                    <Card key={index} className="p-3 flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person portrait" />
                            <AvatarFallback>{user.name.slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                            <p className="font-semibold text-foreground">{item.date}</p>
                            <p className="text-sm text-muted-foreground">Masuk: {item.checkIn} | Keluar: {item.checkOut}</p>
                        </div>
                        <Badge variant={
                            item.status === 'Hadir' ? 'default' :
                            item.status === 'Terlambat' ? 'secondary' : 
                            item.status === 'Absen' ? 'outline' : 'destructive'
                        } className="w-24 justify-center">{item.status}</Badge>
                    </Card>
                ))}
            </div>
        </div>
    );
}
