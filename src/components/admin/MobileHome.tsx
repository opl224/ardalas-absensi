
'use client'

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Clock, Users, FileText, Settings, BedDouble } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader } from "@/components/ui/loader";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, onSnapshot, Timestamp, doc, getDoc } from "firebase/firestore";
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
    offDay: number;
    total: number;
    rate: number;
}

interface MobileHomeProps {
    setActiveView: (view: ActiveView) => void;
    setShowSettingsDialog: (isOpen: boolean) => void;
}

const isCheckinTimeOver = (settings: any): boolean => {
    if (!settings || !settings.checkInEnd) return false;

    const now = new Date();
    const [endHours, endMinutes] = settings.checkInEnd.split(':').map(Number);
    const gracePeriodMinutes = Number(settings.gracePeriod) || 0;

    const deadline = new Date();
    deadline.setHours(endHours, endMinutes, 0, 0);
    deadline.setMinutes(deadline.getMinutes() + gracePeriodMinutes);

    return now > deadline;
};

const splitTextFrom = { opacity: 0, y: 20 };
const splitTextTo = { opacity: 1, y: 0 };

export function MobileHome({ setActiveView, setShowSettingsDialog }: MobileHomeProps) {
    const { userProfile } = useAuth();
    const [dateTime, setDateTime] = useState({ date: '', time: '' });
    const [stats, setStats] = useState<Stats>({ present: 0, absent: 0, late: 0, offDay: 0, total: 0, rate: 0 });
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<any | null>(null);
    const [showAvatarDialog, setShowAvatarDialog] = useState(false);
    const [totalGurus, setTotalGurus] = useState(0);

    const isOffDay = useMemo(() => {
        if (!settings) return false;
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-US', { weekday: 'long' });
        return settings.offDays?.includes(todayStr) ?? false;
    }, [settings]);

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
        const teachersQuery = query(collection(db, 'teachers'));
        const unsubscribe = onSnapshot(teachersQuery, (snapshot) => {
            setTotalGurus(snapshot.size);
        });
        return () => unsubscribe();
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

    // Main logic effect, re-runs when settings or totalGurus change
    useEffect(() => {
        if (!settings) return;

        setLoading(true);

        if (isOffDay) {
            setStats({ present: 0, absent: 0, late: 0, offDay: totalGurus, total: totalGurus, rate: 0 });
            setLoading(false);
            return;
        }

        if (totalGurus === 0) {
            setStats({ present: 0, absent: 0, late: 0, offDay: 0, total: 0, rate: 0 });
            setLoading(false);
            return;
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
            const allTodaysRecords = snapshot.docs.map(doc => doc.data());
            
            // Filter only for active attendances for the table and counts
            const activeAttendances = allTodaysRecords.filter(
                a => a.status === 'Hadir' || a.status === 'Terlambat'
            );
            
            const presentCount = activeAttendances.filter(a => a.status === 'Hadir').length;
            const lateCount = activeAttendances.filter(a => a.status === 'Terlambat').length;
            const totalWithRecords = presentCount + lateCount;

            let absentCount = 0;
            // Only mark as absent if the check-in time is over
            if (isCheckinTimeOver(settings)) {
                absentCount = totalGurus - totalWithRecords;
            }

            const attendanceRate = totalGurus > 0 ? Math.round((totalWithRecords / totalGurus) * 100) : 0;
            
            setStats({
                present: presentCount,
                absent: absentCount >= 0 ? absentCount : 0,
                late: lateCount,
                offDay: 0,
                total: totalGurus,
                rate: attendanceRate
            });
            setLoading(false);
        }, (error) => {
            console.error("Error fetching stats: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [settings, totalGurus, isOffDay]);

    if (!userProfile) {
        return null;
    }

    const isCustomAvatar = userProfile.avatar && !userProfile.avatar.includes('placehold.co');
    
    const StatCircle = ({ value, label, colorClass, icon: Icon, iconColor = 'text-white' }: { value: string | number; label: string; colorClass: string; icon?: React.ElementType, iconColor?: string }) => (
        <div>
            <div className={`w-16 h-16 ${colorClass} rounded-full flex items-center justify-center text-2xl font-bold`}>
                {Icon ? <Icon className={`h-8 w-8 ${iconColor}`} /> : <span className={iconColor}>{value}</span>}
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">{label}</p>
        </div>
    );

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
                {isCustomAvatar ? (
                    <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
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
                ) : (
                    <Avatar className="h-14 w-14">
                        <AvatarImage src={userProfile.avatar} alt={userProfile.name} data-ai-hint="person portrait" />
                        <AvatarFallback>{userProfile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                )}
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
                               {isOffDay ? (
                                    <StatCircle value={stats.offDay} label="Libur" colorClass="bg-secondary" icon={BedDouble} iconColor="text-secondary-foreground"/>
                                ) : (
                                    <>
                                        <StatCircle value={stats.present} label="Hadir" colorClass="bg-green-500" />
                                        <StatCircle value={stats.absent} label="Tidak Hadir" colorClass="bg-red-500" />
                                        <StatCircle value={stats.late} label="Terlambat" colorClass="bg-yellow-400" iconColor="text-black" />
                                    </>
                                )}
                            </div>
                            <Separator className="my-4" />
                            <div className="flex justify-between items-center text-sm">
                                <p className="font-medium text-foreground">Tingkat Kehadiran Guru</p>
                                <p className="font-bold text-primary text-base">{isOffDay ? '0%' : `${stats.rate}%`}</p>
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
