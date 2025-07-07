'use client'

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { collection, query, orderBy, limit, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LottieLoader } from '../ui/lottie-loader';

interface AttendanceRecord {
    id: string;
    name: string;
    role: string;
    checkInTime: Timestamp;
    status: 'Hadir' | 'Terlambat' | 'Penipuan' | 'Absen';
    location: string;
    avatar?: string;
}

export function Attendance() {
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: Implement real-time data fetching from Firestore
        const fetchAttendance = async () => {
            setLoading(true);
            try {
                // This is a placeholder fetch, replace with your actual Firestore query
                const q = query(collection(db, "photo_attendances"), orderBy("checkInTime", "desc"), limit(20));
                const querySnapshot = await getDocs(q);
                const data: AttendanceRecord[] = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as AttendanceRecord[];
                 setAttendanceData(data);
            } catch (error) {
                console.error("Error fetching attendance data: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, []);

    return (
        <div className="bg-gray-50 dark:bg-zinc-900 p-4">
             <header className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-foreground">Catatan Kehadiran</h1>
            </header>
            {loading ? (
                 <div className="flex justify-center items-center h-64">
                    <LottieLoader size={80} />
                </div>
            ) : (
                <div className="space-y-3">
                    {attendanceData.map((item) => (
                        <Card key={item.id} className="p-3 flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={item.avatar} alt={item.name} data-ai-hint="person portrait" />
                                <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-grow">
                                <p className="font-semibold text-foreground">{item.name}</p>
                                <p className="text-sm text-muted-foreground">{item.role}</p>
                                <p className="text-sm text-muted-foreground">{item.checkInTime.toDate().toLocaleTimeString('id-ID')} - {item.location}</p>
                            </div>
                            <Badge variant={
                                item.status === 'Hadir' ? 'default' :
                                item.status === 'Terlambat' ? 'secondary' : 'destructive'
                            } className="w-24 justify-center">{item.status}</Badge>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
