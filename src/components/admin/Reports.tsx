'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Clock } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { LottieLoader } from '../ui/lottie-loader';
import { Button } from '../ui/button';

interface ReportStats {
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
    rateChange: number;
}

const StatCard = ({ title, value, icon: Icon, color, description }: { title: string, value: string | number, icon: React.ElementType, color: string, description?: string }) => (
    <Card className={`border-l-4 ${color}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <Icon className="h-6 w-6 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold">{value}</div>
            <p className="text-sm text-muted-foreground">{title}</p>
        </CardContent>
    </Card>
);

const AttendanceRateChart = ({ rate, change }: { rate: number, change: number }) => {
    const data = [
        { name: 'Present', value: rate },
        { name: 'Absent', value: 100 - rate }
    ];
    const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted))'];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tingkat Kehadiran</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                <div className="w-24 h-24 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={40}
                                startAngle={90}
                                endAngle={450}
                                paddingAngle={0}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-foreground">{`${rate.toFixed(1)}%`}</span>
                    </div>
                </div>
                <div className="flex-grow">
                    <p className="font-medium">Tingkat kehadiran yang sangat baik untuk hari ini</p>
                    <p className={`text-sm font-semibold ${change >= 0 ? 'text-success-foreground' : 'text-destructive'}`}>
                        {change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`} dari periode sebelumnya
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};


export function Reports() {
    const [stats, setStats] = useState<ReportStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('today');

    useEffect(() => {
        const fetchReportData = async () => {
            setLoading(true);
            try {
                // For now, only 'today' is implemented
                const today = new Date();
                const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

                // Fetch total students
                const studentsQuery = query(collection(db, 'users'), where('role', '==', 'siswa'));
                const studentsSnapshot = await getDocs(studentsQuery);
                const totalStudents = studentsSnapshot.size;

                // Fetch today's attendance for students
                const attendanceQuery = query(
                    collection(db, "photo_attendances"),
                    where("role", "==", "siswa"),
                    where("checkInTime", ">=", startOfToday),
                    where("checkInTime", "<", endOfToday)
                );
                const attendanceSnapshot = await getDocs(attendanceQuery);
                
                const presentCount = attendanceSnapshot.docs.filter(doc => doc.data().status !== 'Terlambat').length;
                const lateCount = attendanceSnapshot.docs.filter(doc => doc.data().status === 'Terlambat').length;
                const totalPresent = presentCount + lateCount;
                const absentCount = totalStudents - totalPresent;
                const attendanceRate = totalStudents > 0 ? (totalPresent / totalStudents) * 100 : 0;
                
                // Placeholder for rate change
                const rateChange = 2.3;

                setStats({
                    totalStudents,
                    present: totalPresent,
                    absent: absentCount < 0 ? 0 : absentCount,
                    late: lateCount,
                    attendanceRate: attendanceRate,
                    rateChange,
                });

            } catch (error) {
                console.error("Error fetching report data: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [activeTab]);


    return (
        <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen">
            <header className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <h1 className="text-xl font-bold text-foreground">Laporan Kehadiran</h1>
            </header>
            <div className="p-4 space-y-6">
                <Tabs defaultValue="today" onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 h-auto">
                        <TabsTrigger value="today" className="py-2">Hari Ini</TabsTrigger>
                        <TabsTrigger value="week" className="py-2">Minggu Ini</TabsTrigger>
                        <TabsTrigger value="month" className="py-2">Bulan Ini</TabsTrigger>
                        <TabsTrigger value="year" className="py-2">Tahun Ini</TabsTrigger>
                    </TabsList>
                </Tabs>
                
                {loading || !stats ? (
                     <div className="flex justify-center items-center h-64">
                        <LottieLoader size={80} />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <StatCard title="Total Siswa" value={stats.totalStudents} icon={Users} color="border-primary" />
                            <StatCard title="Hadir Hari Ini" value={stats.present} icon={TrendingUp} color="border-success" />
                            <StatCard title="Absen Hari Ini" value={stats.absent} icon={Clock} color="border-destructive" />
                            <StatCard title="Terlambat Hari Ini" value={stats.late} icon={Clock} color="border-warning" />
                        </div>

                        <AttendanceRateChart rate={stats.attendanceRate} change={stats.rateChange} />

                        <Card>
                            <CardHeader>
                                <CardTitle>Laporan Unduhan</CardTitle>
                                <CardDescription>Unduh laporan kehadiran dalam format PDF atau CSV.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex gap-2">
                                <Button variant="outline">Unduh PDF</Button>
                                <Button variant="outline">Unduh CSV</Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
