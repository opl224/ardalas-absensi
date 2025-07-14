
'use client';

import { useEffect, useState, useTransition } from "react";
import { Settings, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { collection, query, orderBy, Timestamp, where, doc, onSnapshot, getDocs, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader } from "@/components/ui/loader";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { AttendanceSettingsDialog } from "./AttendanceSettingsDialog";
import { useToast } from "@/hooks/use-toast";

interface AttendanceRecord {
    id: string;
    name: string;
    role: string;
    checkInTime: Timestamp;
    status: 'Hadir' | 'Terlambat' | 'Tidak Hadir' | 'Libur';
    isFraudulent?: boolean;
}

interface Stats {
    present: number;
    absent: number;
    late: number;
    offDay: number;
    total: number;
    rate: number;
}

export function DashboardHome() {
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [stats, setStats] = useState<Stats>({ present: 0, absent: 0, late: 0, offDay: 0, total: 0, rate: 0 });
    const [loading, setLoading] = useState(true);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [settings, setSettings] = useState<any | null>(null);
    const [totalGurus, setTotalGurus] = useState(0);
    const [isMarking, startTransition] = useTransition();
    const { toast } = useToast();

    // Effect to get total gurus count
    useEffect(() => {
        const teachersQuery = query(collection(db, 'teachers'));
        const unsubscribe = onSnapshot(teachersQuery, (snapshot) => {
            setTotalGurus(snapshot.size);
        }, (error) => {
            console.error("Error fetching total gurus:", error);
            setTotalGurus(0); // Set to 0 on error
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
            setAttendanceData([]);
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
            ) as AttendanceRecord[];
            setAttendanceData(presentAndLateRecords.sort((a,b) => b.checkInTime.toMillis() - a.checkInTime.toMillis()));
            
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

    const handleMarkAbsentees = () => {
        startTransition(async () => {
            try {
                const today = new Date();
                const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

                const teachersQuery = query(collection(db, "teachers"));
                const teachersSnapshot = await getDocs(teachersQuery);
                const allTeachers = new Map(teachersSnapshot.docs.map(doc => [doc.id, doc.data()]));

                if (allTeachers.size === 0) {
                    toast({ title: "Info", description: "Tidak ada data guru untuk diproses." });
                    return;
                }

                const attendanceQuery = query(
                    collection(db, "photo_attendances"),
                    where("checkInTime", ">=", startOfToday),
                    where("checkInTime", "<", endOfToday)
                );
                const attendanceSnapshot = await getDocs(attendanceQuery);
                const presentUserIds = new Set(attendanceSnapshot.docs.map(doc => doc.data().userId));

                let absentTeachersMarked = 0;
                for (const [teacherId, teacherData] of allTeachers.entries()) {
                    if (!presentUserIds.has(teacherId)) {
                        const absentRecord = {
                            userId: teacherId,
                            name: (teacherData as any).name,
                            role: (teacherData as any).role || 'guru',
                            checkInTime: new Date(), 
                            checkInLocation: null,
                            checkInPhotoUrl: null,
                            isFraudulent: false,
                            fraudReason: '',
                            status: "Tidak Hadir",
                        };

                        const absentDocId = `absent-${today.toISOString().slice(0, 10)}-${teacherId}`;
                        const attendanceRef = doc(db, "photo_attendances", absentDocId);
                        
                        const docSnap = await getDoc(attendanceRef);
                        if (!docSnap.exists()) {
                            await setDoc(attendanceRef, absentRecord);
                            absentTeachersMarked++;
                        }
                    }
                }

                if (absentTeachersMarked === 0) {
                    toast({ title: "Info", description: "Semua guru telah melakukan absensi atau sudah ditandai tidak hadir." });
                } else {
                    toast({ title: "Proses Selesai", description: `${absentTeachersMarked} guru telah ditandai sebagai Tidak Hadir.` });
                }

            } catch (e: any) {
                console.error("Error marking absentees: ", e);
                toast({ variant: "destructive", title: "Proses Gagal", description: `Kesalahan: ${e.message}.` });
            }
        });
    }

    const StatCircle = ({ value, label, colorClass, labelColorClass = 'text-muted-foreground' }: { value: number; label: string; colorClass: string; labelColorClass?: string; }) => (
        <div>
            <div className={`w-20 h-20 ${colorClass} rounded-full flex items-center justify-center text-3xl font-bold`}>{value}</div>
            <p className={`mt-2 text-sm font-medium ${labelColorClass}`}>{label}</p>
        </div>
    );

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader className="flex flex-row items-start justify-between p-4">
                    <div>
                        <CardTitle className="text-lg">Kehadiran Guru Hari Ini</CardTitle>
                        <CardDescription>Ringkasan kehadiran guru untuk hari ini.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowSettingsDialog(true)}>
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        <span className="sr-only">Pengaturan</span>
                    </Button>
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
            <Card>
                <CardHeader>
                    <CardTitle>Aktivitas Guru Hari Ini</CardTitle>
                    <CardDescription>
                        Catatan absensi masuk guru untuk hari ini.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pengguna</TableHead>
                                <TableHead className="hidden sm:table-cell">Peran</TableHead>
                                <TableHead className="hidden sm:table-cell">Waktu</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow key="loading-row"><TableCell colSpan={4} className="py-8"><div className="flex justify-center"><Loader scale={0.8}/></div></TableCell></TableRow>
                            ) : stats.offDay > 0 ? (
                                <TableRow key="off-day-row"><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Hari ini libur.</TableCell></TableRow>
                            ) : attendanceData.length > 0 ? (
                                attendanceData.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="font-medium">{item.name}</div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell capitalize">{item.role}</TableCell>
                                        <TableCell className="hidden sm:table-cell">{item.checkInTime.toDate().toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'})}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                item.isFraudulent ? 'destructive' :
                                                item.status === 'Hadir' ? 'success' :
                                                item.status === 'Terlambat' ? 'warning' : 'destructive'
                                            }>{item.isFraudulent ? 'Kecurangan' : item.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow key="no-activity-row"><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Belum ada aktivitas hari ini.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <AttendanceSettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />
        </main>
    );
}
