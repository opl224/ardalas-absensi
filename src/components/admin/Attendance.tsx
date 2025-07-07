'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const attendanceData = [
    { name: "Alex Doe", role: "Student", time: "08:01 AM", status: "Present", location: "On-site", avatar: 'https://placehold.co/100x100.png', dataAiHint: 'person portrait' },
    { name: "Samantha Bee", role: "Student", time: "08:03 AM", status: "Present", location: "On-site", avatar: 'https://placehold.co/100x100.png', dataAiHint: 'person portrait' },
    { name: "Dr. Evelyn Reed", role: "Teacher", time: "07:55 AM", status: "Present", location: "On-site", avatar: 'https://placehold.co/100x100.png', dataAiHint: 'person portrait' },
    { name: "John Smith", role: "Student", time: "08:15 AM", status: "Late", location: "On-site", avatar: 'https://placehold.co/100x100.png', dataAiHint: 'person portrait' },
    { name: "Jane Roe", role: "Student", time: "09:00 AM", status: "Fraudulent", location: "Off-site", avatar: 'https://placehold.co/100x100.png', dataAiHint: 'person portrait' },
    { name: "Mike Ross", role: "Teacher", time: "07:45 AM", status: "Present", location: "On-site", avatar: 'https://placehold.co/100x100.png', dataAiHint: 'person portrait' },
];

export function Attendance() {
    return (
        <div className="bg-gray-50 dark:bg-zinc-900 p-4">
             <header className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-foreground">Attendance Log</h1>
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
                            item.status === 'Present' ? 'default' :
                            item.status === 'Late' ? 'secondary' : 'destructive'
                        } className="w-24 justify-center">{item.status}</Badge>
                    </Card>
                ))}
            </div>
        </div>
    )
}
