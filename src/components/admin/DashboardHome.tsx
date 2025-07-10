
'use client';

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
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
import { collection, query, orderBy, Timestamp, where, doc, onSnapshot, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader } from "@/components/ui/loader";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { AttendanceSettingsDialog } from "./AttendanceSettingsDialog";

interface AttendanceRecord {
    id: string;
    name: string;
    role: string;
    checkInTime: Timestamp;
    status: 'Hadir' | 'Terlambat' | 'Tidak Hadir';
    isFraudulent?: boolean;
}

interface Stats {
    present: number;
    absent: number;
    late: number;
    total: number;
    rate: number;
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

export function DashboardHome() {
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [stats, setStats] = useState<Stats>({ present: 0, absent: 0, late: 0, total: 0, rate: 0 });
    const [loading, setLoading] = useState(true);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [settings, setSettings] = useState<any | null>(null);
    const [totalGurus, setTotalGurus] = useState(0);

    // Effect to get total gurus count
    useEffect(() => {
        const teachersQuery = query(collection(db, 'teachers'));
        const unsubscribe = onSnapshot(teachersQuery, (snapshot) => {
            setTotalGurus(snapshot.size);
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
        if (!settings) return;

        setLoading(true);

        const now = new Date();
        const todayStr = now.toLocaleDateString('en-US', { weekday: 'long' });

        if (settings.offDays?.includes(todayStr) && totalGurus > 0) {
            setStats({ present: 0, absent: totalGurus, late: 0, total: totalGurus, rate: 0 });
            setAttendanceData([]);
            setLoading(false);
            return;
        }
        
        if (totalGurus === 0) {
            setStats({ present: 0, absent: 0, late: 0, total: 0, rate: 0 });
            setAttendanceData([]);
            setLoading(false);
            return;
        }
        
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        // This query now includes 'Tidak Hadir' to correctly filter it out later
        const attendanceQuery = query(
            collection(db, "photo_attendances"),
            where("role", "==", "guru"),
            where("checkInTime", ">=", startOfToday),
            where("checkInTime", "<", endOfToday)
        );

        const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
            // Get all records for today, including "Tidak Hadir"
            const allTodaysRecords = snapshot.docs.map(doc => doc.data());
            
            // Filter only for active attendances for the table and counts
            const activeAttendances = allTodaysRecords.filter(
                a => a.status === 'Hadir' || a.status === 'Terlambat'
            ) as AttendanceRecord[];
            setAttendanceData(activeAttendances);
            
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
                                <div>
                                    <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center text-3xl font-bold">{stats.present}</div>
                                    <p className="mt-2 text-sm font-medium text-muted-foreground">Hadir</p>
                                </div>
                                <div>
                                    <div className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center text-3xl font-bold">{stats.absent}</div>
                                    <p className="mt-2 text-sm font-medium text-muted-foreground">Tidak Hadir</p>
                                </div>
                                <div>
                                    <div className="w-20 h-20 bg-yellow-400 text-black rounded-full flex items-center justify-center text-3xl font-bold">{stats.late}</div>
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
                                <TableRow><TableCell colSpan={4} className="py-8"><div className="flex justify-center"><Loader scale={0.8}/></div></TableCell></TableRow>
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
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Belum ada aktivitas hari ini.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <AttendanceSettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />
        </main>
    );
}
