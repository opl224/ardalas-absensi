'use client'

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LottieLoader } from '../ui/lottie-loader';

interface HistoryRecord {
    id: string;
    checkInTime: Timestamp;
    checkOutTime?: Timestamp;
    status: 'Hadir' | 'Terlambat' | 'Penipuan' | 'Absen';
}

export function AttendanceHistory() {
  const { userProfile } = useAuth();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) {
        setLoading(false);
        return;
    };

    const q = query(
        collection(db, "photo_attendances"),
        where("userId", "==", userProfile.uid),
        orderBy("checkInTime", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const historyData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as HistoryRecord[];
        setHistory(historyData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching attendance history: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  if (!userProfile) {
    return <div className="p-4 text-center">Memuat data pengguna...</div>
  }

    return (
        <div className="bg-gray-50 dark:bg-zinc-900">
            <header className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <h1 className="text-xl font-bold text-foreground">Riwayat Kehadiran</h1>
            </header>

            <div className="p-4">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <LottieLoader size={80} />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">Belum ada riwayat kehadiran.</p>
                        ) : (
                            history.map((item) => (
                                <Card key={item.id} className="p-3 flex items-center gap-4">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={userProfile.avatar} alt={userProfile.name} data-ai-hint="person portrait" />
                                        <AvatarFallback>{userProfile.name.slice(0,2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow">
                                        <p className="font-semibold text-foreground">{item.checkInTime.toDate().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Masuk: {item.checkInTime.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                            {item.checkOutTime ? ` | Keluar: ${item.checkOutTime.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
                                        </p>
                                    </div>
                                    <Badge variant={
                                        item.status === 'Hadir' ? 'default' :
                                        item.status === 'Terlambat' ? 'secondary' : 'destructive'
                                    } className="w-20 justify-center">{item.status}</Badge>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
