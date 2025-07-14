
'use client';

import { useEffect, useState } from "react";
import { UserPlus, Users, LineChart, CheckSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { collection, query, onSnapshot, doc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader } from "@/components/ui/loader";
import { Separator } from "../ui/separator";
import { AttendanceSettingsDialog } from "./AttendanceSettingsDialog";

interface Stats {
    present: number;
    absent: number;
    late: number;
    offDay: number;
    total: number;
    rate: number;
}

interface DashboardHomeProps {
  setActiveView?: (view: 'users' | 'reports' | 'attendance') => void;
}


export function DashboardHome({ setActiveView }: DashboardHomeProps) {
    const [stats, setStats] = useState<Stats>({ present: 0, absent: 0, late: 0, offDay: 0, total: 0, rate: 0 });
    const [loading, setLoading] = useState(true);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [settings, setSettings] = useState<any | null>(null);
    const [totalGurus, setTotalGurus] = useState(0);

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


    const StatCircle = ({ value, label, colorClass }: { value: number; label: string; colorClass: string; }) => (
        <div>
            <div className={`w-20 h-20 ${colorClass} rounded-full flex items-center justify-center text-3xl font-bold`}>{value}</div>
            <p className={`mt-2 text-sm font-medium text-muted-foreground`}>{label}</p>
        </div>
    );
    
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

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader className="p-4">
                    <CardTitle className="text-lg">Kehadiran Guru Hari Ini</CardTitle>
                    <CardDescription>Ringkasan kehadiran guru untuk hari ini.</CardDescription>
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
                <CardFooter className="p-4 border-t">
                     <button className="button-schedule-settings w-full" onClick={() => setShowSettingsDialog(true)}>
                        Atur Jadwal
                    </button>
                </CardFooter>
            </Card>
            
            <div className="space-y-4">
                 <QuickActionButton 
                    icon={Users}
                    title="Manajemen Pengguna"
                    description="Kelola data admin dan guru"
                    onClick={() => setActiveView?.('users')}
                 />
                 <div className="grid grid-cols-2 gap-4">
                     <QuickActionButton 
                        icon={LineChart}
                        title="Laporan"
                        description="Lihat laporan"
                        onClick={() => setActiveView?.('reports')}
                     />
                     <QuickActionButton 
                        icon={CheckSquare}
                        title="Kehadiran"
                        description="Pantau kehadiran"
                        onClick={() => setActiveView?.('attendance')}
                     />
                 </div>
            </div>

            <AttendanceSettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />
        </main>
    );
}
