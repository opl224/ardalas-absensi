'use client'

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AttendanceHistoryProps {
  user: {
    name: string;
    avatar: string;
  };
}

const historyData = [
  { date: 'July 7, 2025', checkIn: '08:05 AM', checkOut: '03:30 PM', status: 'Present' },
  { date: 'July 6, 2025', checkIn: '08:01 AM', checkOut: '03:32 PM', status: 'Present' },
  { date: 'July 5, 2025', checkIn: '08:17 AM', checkOut: '03:25 PM', status: 'Late' },
  { date: 'July 4, 2025', checkIn: '-', checkOut: '-', status: 'Absent' },
  { date: 'July 3, 2025', checkIn: '08:00 AM', checkOut: '03:30 PM', status: 'Present' },
  { date: 'July 2, 2025', checkIn: '08:03 AM', checkOut: '03:31 PM', status: 'Present' },
];

export function AttendanceHistory({ user }: AttendanceHistoryProps) {
    return (
        <div className="bg-gray-50 dark:bg-zinc-900 p-4 min-h-screen">
            <header className="mb-6">
                <h1 className="text-xl font-bold text-foreground">Attendance History</h1>
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
                            <p className="text-sm text-muted-foreground">In: {item.checkIn} | Out: {item.checkOut}</p>
                        </div>
                        <Badge variant={
                            item.status === 'Present' ? 'default' :
                            item.status === 'Late' ? 'secondary' : 'destructive'
                        } className="w-20 justify-center">{item.status}</Badge>
                    </Card>
                ))}
            </div>
        </div>
    );
}
