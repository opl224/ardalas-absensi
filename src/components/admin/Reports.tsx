
'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Clock, Download } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { LottieLoader } from '../ui/lottie-loader';
import { Button } from '../ui/button';

interface ReportStats {
    totalGurus: number;
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
    rateChange: number;
}

interface AttendanceReportRecord {
    name: string;
    checkInTime: string;
    checkOutTime: string;
    status: string;
    fraudReason: string;
}

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: React.ElementType, color: string }) => (
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
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-28 h-28 relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={45}
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
                        <span className="text-2xl font-bold text-foreground">{`${rate.toFixed(0)}%`}</span>
                    </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                    <p className="font-medium">Tingkat kehadiran untuk periode yang dipilih.</p>
                    <p className={`text-sm font-semibold ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`} dari periode sebelumnya
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};


export function Reports() {
    const [stats, setStats] = useState<ReportStats | null>(null);
    const [reportData, setReportData] = useState<AttendanceReportRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('today');

    useEffect(() => {
        const fetchReportData = async () => {
            setLoading(true);
            try {
                const now = new Date();
                let startDate: Date;
                const endDate: Date = new Date(); 

                switch (activeTab) {
                    case 'week':
                        const firstDayOfWeek = now.getDate() - now.getDay();
                        startDate = new Date(now.setDate(firstDayOfWeek));
                        break;
                    case 'month':
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                        break;
                    case 'year':
                        startDate = new Date(now.getFullYear(), 0, 1);
                        break;
                    case 'today':
                    default:
                        startDate = new Date();
                        break;
                }
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                
                const gurusQuery = query(collection(db, 'users'), where('role', '==', 'guru'));
                const gurusSnapshot = await getDocs(gurusQuery);
                const totalGurus = gurusSnapshot.size;

                const attendanceQuery = query(
                    collection(db, "photo_attendances"),
                    where("role", "==", "guru"),
                    where("checkInTime", ">=", startDate),
                    where("checkInTime", "<=", endDate)
                );
                const attendanceSnapshot = await getDocs(attendanceQuery);
                const attendanceDocs = attendanceSnapshot.docs;
                
                const presentUserIds = new Set(attendanceDocs.map(doc => doc.data().userId));
                const presentCount = presentUserIds.size;
                const lateCount = attendanceDocs.filter(doc => doc.data().status === 'Terlambat').length;
                
                const absentCount = totalGurus - presentCount;
                const attendanceRate = totalGurus > 0 ? (presentCount / totalGurus) * 100 : 0;
                
                const rateChange = 2.3; // Placeholder

                setStats({
                    totalGurus,
                    present: presentCount,
                    absent: absentCount < 0 ? 0 : absentCount,
                    late: lateCount,
                    attendanceRate,
                    rateChange,
                });
                
                const detailedData: AttendanceReportRecord[] = attendanceDocs.map(doc => {
                    const data = doc.data();
                    return {
                        name: data.name || 'N/A',
                        checkInTime: data.checkInTime ? (data.checkInTime as Timestamp).toDate().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-',
                        checkOutTime: data.checkOutTime ? (data.checkOutTime as Timestamp).toDate().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-',
                        status: data.status || 'N/A',
                        fraudReason: data.fraudReason || '-',
                    };
                });
                setReportData(detailedData);

            } catch (error) {
                console.error("Error fetching report data: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [activeTab]);

    const handleDownload = async (format: 'pdf' | 'csv') => {
        if (loading || reportData.length === 0) {
            alert('Data tidak tersedia atau sedang dimuat. Silakan coba lagi nanti.');
            return;
        }

        const headers = ['Nama', 'Waktu Absen Masuk', 'Waktu Absen Keluar', 'Status', 'Alasan Penipuan'];
        const data = reportData.map(d => [d.name, d.checkInTime, d.checkOutTime, d.status, d.fraudReason]);
        
        const periodMap: { [key: string]: string } = {
            today: 'Hari Ini',
            week: 'Minggu Ini',
            month: 'Bulan Ini',
            year: 'Tahun Ini'
        };
        const period = periodMap[activeTab] || activeTab;
        const filename = `Laporan_Kehadiran_Guru_${period.replace(' ','_')}_${new Date().toISOString().slice(0, 10)}`;

        if (format === 'csv') {
            const csvContent = [
                headers.join(','),
                ...data.map(row => row.join(','))
            ].join('\n');

            const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        if (format === 'pdf') {
            const jsPDF = (await import('jspdf')).default;
            const autoTable = (await import('jspdf-autotable')).default;

            const doc = new jsPDF();
            doc.text(`Laporan Kehadiran Guru - ${period}`, 14, 16);
            autoTable(doc, {
                head: [headers],
                body: data,
                startY: 20,
            });
            doc.save(`${filename}.pdf`);
        }
    }

    return (
        <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen">
            <header className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <h1 className="text-xl font-bold text-foreground">Laporan Kehadiran Guru</h1>
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
                            <StatCard title="Total Guru" value={stats.totalGurus} icon={Users} color="border-primary" />
                            <StatCard title="Hadir" value={stats.present} icon={TrendingUp} color="border-success" />
                            <StatCard title="Absen" value={stats.absent} icon={Clock} color="border-destructive" />
                            <StatCard title="Terlambat" value={stats.late} icon={Clock} color="border-warning" />
                        </div>

                        <AttendanceRateChart rate={stats.attendanceRate} change={stats.rateChange} />

                        <Card>
                            <CardHeader>
                                <CardTitle>Laporan Unduhan</CardTitle>
                                <CardDescription>Unduh laporan kehadiran dalam format PDF atau CSV untuk periode yang dipilih.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex gap-2">
                                <Button variant="outline" onClick={() => handleDownload('pdf')}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Unduh PDF
                                </Button>
                                <Button variant="outline" onClick={() => handleDownload('csv')}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Unduh CSV
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
