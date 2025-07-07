'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const attendanceData = [
    { name: "Alex Doe", role: "Siswa", time: "08:01 AM", status: "Hadir", location: "Di tempat", avatar: 'https://placehold.co/100x100.png', dataAiHint: 'person portrait' },
    { name: "Samantha Bee", role: "Siswa", time: "08:03 AM", status: "Hadir", location: "Di tempat", avatar: 'https://placehold.co/100x100.png', dataAiHint: 'person portrait' },
    { name: "Dr. Evelyn Reed", role: "Guru", time: "07:55 AM", status: "Hadir", location: "Di tempat", avatar: 'https://placehold.co/100x100.png', dataAiHint: 'person portrait' },
    { name: "John Smith", role: "Siswa", time: "08:15 AM", status: "Terlambat", location: "Di tempat", avatar: 'https://placehold.co/100x100.png', dataAiHint: 'person portrait' },
    { name: "Jane Roe", role: "Siswa", time: "09:00 AM", status: "Penipuan", location: "Di luar lokasi", avatar: 'https://placehold.co/100x100.png', dataAiHint: 'person portrait' },
    { name: "Mike Ross", role: "Guru", time: "07:45 AM", status: "Hadir", location: "Di tempat", avatar: 'https://placehold.co/100x100.png', dataAiHint: 'person portrait' },
];

export function Attendance() {
    return (
        <div className="bg-gray-50 dark:bg-zinc-900 p-4">
             <header className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-foreground">Catatan Kehadiran</h1>
            </header>
            <div className="space-y-3">
                {attendanceData.map((item, index) => (
                    <Card key={index} className="p-3 flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={item.avatar} alt={item.name} data-ai-hint={item.dataAiHint} />
                            <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                            <p className="font-semibold text-foreground">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.role}</p>
                            <p className="text-sm text-muted-foreground">{item.time} - {item.location}</p>
                        </div>
                        <Badge variant={
                            item.status === 'Hadir' ? 'default' :
                            item.status === 'Terlambat' ? 'secondary' : 'destructive'
                        } className="w-24 justify-center">{item.status}</Badge>
                    </Card>
                ))}
            </div>
        </div>
    )
}
