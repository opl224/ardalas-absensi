
'use client';

import { Settings, UserPlus, LineChart, CheckSquare, CalendarDays, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button, buttonVariants } from "../ui/button";
import { AttendanceSettingsDialog } from "./AttendanceSettingsDialog";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { CenteredLoader, Loader } from "../ui/loader";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Separator } from "../ui/separator";
import SplitText from "../ui/SplitText";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MobileHomeProps {
  setActiveView?: (view: 'users' | 'reports' | 'attendance' | 'privacy', index: number) => void;
}

interface Stats {
    present: number;
    absent: number;
    late: number;
    offDay: number;
    total: number;
    rate: number;
}

const QuickActionButton = ({ icon: Icon, title, description, onClick, className }: { icon: React.ElementType, title: string, description: string, onClick?: () => void, className?: string }) => (
    <button onClick={onClick} className="w-full text-left p-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
        <Card className={`hover:bg-secondary/50 transition-colors w-full ${className}`}>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                <div className="bg-primary/10 text-primary p-3 rounded-lg">
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <p className="font-semibold text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </CardHeader>
        </Card>
    </button>
);

const StatCircle = ({ value, label, colorClass }: { value: number; label: string; colorClass: string; }) => (
    <div>
        <div className={`w-20 h-20 ${colorClass} rounded-full flex items-center justify-center text-3xl font-bold`}>{value}</div>
        <p className={`mt-2 text-sm font-medium text-muted-foreground`}>{label}</p>
    </div>
);

const splitTextFrom = { opacity: 0, y: 20 };
const splitTextTo = { opacity: 1, y: 0 };

export function MobileHome({ setActiveView }: MobileHomeProps) {
    const { userProfile } = useAuth();
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [stats, setStats] = useState<Stats>({ present: 0, absent: 0, late: 0, offDay: 0, total: 0, rate: 0 });
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<any | null>(null);
    const [totalGurus, setTotalGurus] = useState(0);
    const [dateTime, setDateTime] = useState({ date: '', time: '' });

    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date();
            setDateTime({
                date: now.toLocaleDateString('id-ID', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
                time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            });
        };
        updateDateTime();
        const interval = setInterval(updateDateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    // Effect to get total gurus count
    useEffect(() => {
        const teachersQuery = query(collection(db, 'teachers'));
        const unsubscribe = onSnapshot(teachersQuery, (snapshot) => {
            setTotalGurus(snapshot.size);
        }, (error) => {
            console.error("Error fetching total gurus:", error);
            setTotalGurus(0);
        });
        return () => unsubscribe();
    }, []);

    // Effect to listen for settings changes
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

    // Effect to fetch data and listen for attendance, re-runs when settings or totalGurus change
    useEffect(() => {
        if (!settings) {
            setLoading(true);
            return;
        }

        setLoading(true);

        const now = new Date();
        const todayStr = now.toLocaleDateString('en-US', { weekday: 'long' });

        if (settings.offDays?.includes(todayStr)) {
            setStats({ present: 0, absent: 0, late: 0, offDay: totalGurus, total: totalGurus, rate: 0 });
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
            const allTodaysRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const presentAndLateRecords = allTodaysRecords.filter(
                a => a.status === 'Hadir' || a.status === 'Terlambat'
            );
            
            const presentCount = presentAndLateRecords.filter(a => a.status === 'Hadir').length;
            const lateCount = presentAndLateRecords.filter(a => a.status === 'Terlambat').length;
            const absentCount = allTodaysRecords.filter(a => a.status === 'Tidak Hadir').length;

            const totalActive = presentCount + lateCount;
            const attendanceRate = totalGurus > 0 ? Math.round((totalActive / totalGurus) * 100) : 0;
            
            setStats({
                present: presentCount,
                absent: absentCount,
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
    }, [settings, totalGurus]);

    if (!userProfile) {
        return <CenteredLoader />
    }

    const isCustomAvatar = userProfile.avatar && !userProfile.avatar.includes('placehold.co');

    return (
        <div className="bg-gray-50 dark:bg-zinc-900">
             <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <h1 className="text-xl font-bold text-foreground">Beranda Admin</h1>
            </header>

            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8">
                 <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Halo,</p>
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
                        <p className="text-sm text-muted-foreground capitalize">{userProfile.role}</p>
                    </div>
                    {isCustomAvatar ? (
                        <Dialog>
                            <DialogTrigger asChild>
                                <div className="relative cursor-pointer">
                                  <Avatar className="h-14 w-14">
                                      <AvatarImage src={userProfile.avatar} alt={userProfile.name} data-ai-hint="person portrait"/>
                                      <AvatarFallback>{userProfile.name.slice(0,2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                </div>
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
                            <AvatarImage src={userProfile.avatar} alt={userProfile.name} data-ai-hint="person portrait"/>
                            <AvatarFallback>{userProfile.name.slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    )}
                </div>

                <Card className="p-4">
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
                
                <Button
                  className={cn(buttonVariants(), "w-full")}
                  onClick={() => setShowSettingsDialog(true)}
                >
                  Atur Jadwal
                </Button>
                 
                 <Card>
                    <CardHeader className="flex flex-row items-start justify-between p-4">
                        <div>
                            <CardTitle className="text-lg">Kehadiran Guru Hari Ini</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        {loading ? (
                            <div className="flex justify-center items-center h-40"><Loader /></div>
                        ) : (
                            <>
                                <div className="flex justify-around text-center py-4">
                                    {stats.offDay > 0 ? (
                                        <StatCircle value={stats.offDay} label="Libur" colorClass="bg-secondary text-secondary-foreground" />
                                    ) : (
                                        <>
                                            <StatCircle value={stats.present} label="Hadir" colorClass="bg-green-500 text-white" />
                                            <StatCircle value={stats.absent} label="Tidak Hadir" colorClass="bg-red-500 text-white" />
                                            <StatCircle value={stats.late} label="Terlambat" colorClass="bg-yellow-400 text-black" />
                                        </>
                                    )}
                                </div>
                                <Separator className="my-4" />
                                <div className="flex justify-between items-center text-sm">
                                    <p className="font-medium text-foreground">Tingkat Kehadiran Guru</p>
                                    <p className="font-bold text-primary text-base">{stats.offDay > 0 ? '-' : `${stats.rate}%`}</p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                         <QuickActionButton 
                            icon={LineChart}
                            title="Laporan"
                            description="Lihat statistik"
                            onClick={() => setActiveView?.('reports', 3)}
                         />
                         <QuickActionButton 
                            icon={CheckSquare}
                            title="Kehadiran"
                            description="Lacak catatan"
                            onClick={() => setActiveView?.('attendance', 2)}
                         />
                    </div>
                    <QuickActionButton 
                        icon={UserPlus}
                        title="Manajemen Pengguna"
                        description="Kelola pengguna admin dan guru"
                        onClick={() => setActiveView?.('users', 1)}
                    />
                </div>
            </main>

            <AttendanceSettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />
        </div>
    );
}
