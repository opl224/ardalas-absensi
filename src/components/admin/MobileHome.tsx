'use client'

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Clock, Users, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LottieLoader } from "@/components/ui/lottie-loader";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, onSnapshot, Timestamp } from "firebase/firestore";

type ActiveView = 'home' | 'profile' | 'users' | 'reports' | 'attendance';

interface Stats {
    present: number;
    absent: number;
    late: number;
    total: number;
    rate: number;
}

export function MobileHome({ setActiveView }: { setActiveView: (view: ActiveView) => void }) {
    const [dateTime, setDateTime] = useState({ date: '', time: '' });
    const [stats, setStats] = useState<Stats>({ present: 0, absent: 0, late: 0, total: 0, rate: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date();
            setDateTime({
                date: now.toLocaleDateString('id-ID', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
                time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            });
        };

        updateDateTime();
        const interval = setInterval(updateDateTime, 60000); // Update time every minute
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                // Get total non-admin users first
                const usersQuery = query(collection(db, 'users'), where('role', 'in', ['siswa', 'guru']));
                const usersSnapshot = await getDocs(usersQuery);
                const totalUserCount = usersSnapshot.size;

                if (totalUserCount === 0) {
                    setStats({ present: 0, absent: 0, late: 0, total: 0, rate: 0 });
                    setLoading(false);
                    return;
                }

                // Then listen for today's attendance
                const today = new Date();
                const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

                const attendanceQuery = query(
                    collection(db, "photo_attendances"),
                    where("checkInTime", ">=", startOfToday),
                    where("checkInTime", "<", endOfToday)
                );

                const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
                    const attendances = snapshot.docs.map(doc => doc.data());
                    
                    const presentCount = attendances.length;
                    const lateCount = attendances.filter(a => a.status === 'Terlambat').length;

                    const absentCount = totalUserCount - presentCount;
                    const attendanceRate = totalUserCount > 0 ? Math.round((presentCount / totalUserCount) * 100) : 0;
                    
                    setStats({
                        present: presentCount,
                        absent: absentCount >= 0 ? absentCount : 0,
                        late: lateCount,
                        total: totalUserCount,
                        rate: attendanceRate
                    });
                     setLoading(false);
                }, (error) => {
                    console.error("Error fetching stats: ", error);
                    setLoading(false);
                });

                return () => unsubscribe();

            } catch (error) {
                console.error("Error fetching total users: ", error);
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold text-foreground">Beranda Admin</h1>

            {/* Welcome Section */}
            <div className="flex items-center justify-between mt-6">
                <div>
                    <p className="text-sm text-muted-foreground">Selamat datang kembali,</p>
                    <p className="text-2xl font-bold text-foreground">Admin User</p>
                    <p className="text-sm text-muted-foreground">Administrator Sistem</p>
                </div>
                <Avatar className="h-14 w-14">
                    <AvatarImage src="https://placehold.co/100x100.png" alt="Admin User" data-ai-hint="person portrait" />
                    <AvatarFallback>AU</AvatarFallback>
                </Avatar>
            </div>

            {/* Date and Time */}
            <Card className="mt-6 p-4">
                <CardContent className="p-0 space-y-3">
                    <div className="flex items-center gap-4">
                        <CalendarDays className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-sm text-foreground">{dateTime.date || 'Memuat tanggal...'}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-sm text-foreground">{dateTime.time || 'Memuat waktu...'}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Today's Overview */}
            <Card className="mt-6">
                <CardHeader className="p-4">
                    <CardTitle className="text-lg">Gambaran Hari Ini</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    {loading ? (
                        <div className="flex justify-center items-center h-40"><LottieLoader /></div>
                    ) : (
                        <>
                            <div className="flex justify-around text-center">
                                <div>
                                    <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">{stats.present}</div>
                                    <p className="mt-2 text-sm font-medium text-muted-foreground">Hadir</p>
                                </div>
                                <div>
                                    <div className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">{stats.absent}</div>
                                    <p className="mt-2 text-sm font-medium text-muted-foreground">Absen</p>
                                </div>
                                <div>
                                    <div className="w-16 h-16 bg-yellow-400 text-black rounded-full flex items-center justify-center text-2xl font-bold">{stats.late}</div>
                                    <p className="mt-2 text-sm font-medium text-muted-foreground">Terlambat</p>
                                </div>
                            </div>
                            <Separator className="my-4" />
                            <div className="flex justify-between items-center text-sm">
                                <p className="font-medium text-foreground">Tingkat Kehadiran Keseluruhan</p>
                                <p className="font-bold text-primary text-base">{stats.rate}%</p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 mt-6">
                <Card onClick={() => setActiveView('users')} className="p-4 flex flex-col items-center justify-center text-center h-28 hover:bg-accent cursor-pointer">
                    <Users className="h-8 w-8 text-primary" />
                    <p className="mt-2 font-medium text-sm text-foreground">Kelola Pengguna</p>
                </Card>
                <Card onClick={() => setActiveView('reports')} className="p-4 flex flex-col items-center justify-center text-center h-28 hover:bg-accent cursor-pointer">
                    <FileText className="h-8 w-8 text-primary" />
                    <p className="mt-2 font-medium text-sm text-foreground">Lihat Laporan</p>
                </Card>
            </div>
        </div>
    );
}
