
'use client'

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Clock, Users, FileText, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader } from "@/components/ui/loader";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, onSnapshot, Timestamp, doc, getDoc } from "firebase/firestore";
import { AttendanceSettingsDialog } from "./AttendanceSettingsDialog";
import { Button } from "../ui/button";
import { useAuth } from "@/hooks/useAuth";
import SplitText from "../ui/SplitText";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ActiveView = 'home' | 'profile' | 'users' | 'reports' | 'attendance';

interface Stats {
    present: number;
    absent: number;
    late: number;
    total: number;
    rate: number;
}

const splitTextFrom = { opacity: 0, y: 20 };
const splitTextTo = { opacity: 1, y: 0 };

export function MobileHome({ setActiveView }: { setActiveView: (view: ActiveView) => void }) {
    const { userProfile } = useAuth();
    const [dateTime, setDateTime] = useState({ date: '', time: '' });
    const [stats, setStats] = useState<Stats>({ present: 0, absent: 0, late: 0, total: 0, rate: 0 });
    const [loading, setLoading] = useState(true);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [settings, setSettings] = useState<any | null>(null);

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

    // Listener for settings changes
    useEffect(() => {
        const settingsRef = doc(db, "settings", "attendance");
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            setSettings(docSnap.exists() ? docSnap.data() : {
                checkInEnd: '09:00',
                offDays: ['Saturday', 'Sunday'],
                gracePeriod: 60,
            });
        });
        return () => unsubscribe();
    }, []);

    // Main logic effect, re-runs when settings change
    useEffect(() => {
        if (!settings) return; // Wait for settings to load

        setLoading(true);
        const fetchStats = async () => {
            try {
                const usersQuery = query(collection(db, 'users'), where('role', '==', 'guru'));
                const usersSnapshot = await getDocs(usersQuery);
                const totalUserCount = usersSnapshot.size;

                if (totalUserCount === 0) {
                    setStats({ present: 0, absent: 0, late: 0, total: 0, rate: 0 });
                    setLoading(false);
                    return () => {};
                }
                
                const now = new Date();
                const todayStr = now.toLocaleDateString('en-US', { weekday: 'long' });
                
                if (settings.offDays.includes(todayStr)) {
                     setStats({ present: 0, absent: 0, late: 0, total: totalUserCount, rate: 100 });
                     setLoading(false);
                     return () => {};
                }
                
                const today = new Date();
                const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

                const attendanceQuery = query(
                    collection(db, "photo_attendances"),
                    where("role", "==", "guru"),
                    where("checkInTime", ">=", startOfToday),
                    where("checkInTime", "<", endOfToday)
                );

                const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
                    const attendances = snapshot.docs.map(doc => doc.data());
                    const presentCount = attendances.length;
                    const lateCount = attendances.filter(a => a.status === 'Terlambat').length;
                    
                    const [endHours, endMinutes] = settings.checkInEnd.split(':').map(Number);
                    const checkInDeadline = new Date();
                    checkInDeadline.setHours(endHours, endMinutes, 0, 0);
                    const gracePeriodMinutes = settings.gracePeriod ?? 60;
                    const checkInGraceEnd = new Date(checkInDeadline.getTime() + gracePeriodMinutes * 60 * 1000);

                    let absentCount = 0;
                    if (new Date() > checkInGraceEnd) {
                        absentCount = totalUserCount - presentCount;
                    }

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

                return unsubscribe;

            } catch (error) {
                console.error("Error fetching total users: ", error);
                setLoading(false);
                return () => {};
            }
        };

        const unsubscribePromise = fetchStats();
        
        return () => {
            unsubscribePromise.then(unsub => unsub && unsub());
        };
    }, [settings]);

    if (!userProfile) {
        return null;
    }

    return (
        <div className="p-4">
            <header className="sticky top-0 z-10 border-b bg-background/95 p-4 -mx-4 -mt-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <h1 className="text-xl font-bold text-foreground">Beranda Admin</h1>
            </header>

            {/* Welcome Section */}
            <div className="flex items-center justify-between mt-6">
                <div>
                    <p className="text-sm text-muted-foreground">Selamat datang kembali,</p>
                    <SplitText
                        text={userProfile.name}
                        className="text-2xl font-bold text-foreground"
                        delay={120}
                        duration={0.8}
                        ease="power3.out"
                        splitType="chars"
                        from={splitTextFrom}
                        to={splitTextTo}
                        textAlign="left"
                    />
                    <p className="text-sm text-muted-foreground">Administrator Sistem</p>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Avatar className="h-14 w-14 cursor-pointer">
                            <AvatarImage src={userProfile.avatar} alt={userProfile.name} data-ai-hint="person portrait" />
                            <AvatarFallback>{userProfile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </DialogTrigger>
                    <DialogContent className="p-0 border-0 bg-transparent shadow-none w-auto max-w-lg">
                        <DialogHeader className="sr-only">
                            <DialogTitle>Avatar {userProfile.name}</DialogTitle>
                            <DialogDescription>Gambar avatar ukuran penuh.</DialogDescription>
                        </DialogHeader>
                        <img src={userProfile.avatar} alt={userProfile.name} className="w-full h-auto rounded-lg" data-ai-hint="person portrait" />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Date and Time */}
            <Card className="mt-6 p-4">
                <div className="flex justify-between items-center">
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
                    <button className="button-89" role="button" onClick={() => setShowSettingsDialog(true)}>
                      Atur
                    </button>
                </div>
            </Card>

            {/* Today's Overview */}
            <Card className="mt-6">
                <CardHeader className="p-4">
                    <CardTitle className="text-lg">Kehadiran Guru Hari Ini</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    {loading ? (
                        <div className="flex justify-center items-center h-40"><Loader /></div>
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
                                <p className="font-medium text-foreground">Tingkat Kehadiran Guru</p>
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
            <AttendanceSettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />
        </div>
    );
}
