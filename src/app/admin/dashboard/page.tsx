
'use client';

import { useEffect, useState } from "react";
import { Home, LineChart, Search, Users2, BookUser, Users, AlertTriangle, GraduationCap, Briefcase, CheckSquare } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UserNav } from "@/components/UserNav"
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarContent, SidebarHeader, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Logo } from "@/components/Logo"
import { AttendanceChart } from "@/components/admin/AttendanceChart"
import { MobileAdminDashboard } from "@/components/admin/MobileAdminDashboard"
import { useAuth } from "@/hooks/useAuth";
import { collection, getDocs, query, orderBy, limit, Timestamp, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CenteredLoader, Loader } from "@/components/ui/loader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Skeleton } from "@/components/ui/skeleton";

interface AttendanceRecord {
    id: string;
    name: string;
    role: string;
    checkInTime: Timestamp;
    status: 'Hadir' | 'Terlambat' | 'Kecurangan' | 'Tidak Hadir';
    isFraudulent?: boolean;
}

interface DashboardStats {
    totalTeachers: number;
    presentToday: number;
    absentToday: number;
    fraudAlerts: number;
}

export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
        try {
            const q = query(collection(db, "photo_attendances"), where("role", "==", "guru"), orderBy("checkInTime", "desc"), limit(10));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                checkInTime: doc.data().checkInTime,
            })) as AttendanceRecord[];
            setAttendanceData(data);
        } catch (error) {
            console.error("Error fetching attendance data: ", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const teachersQuery = query(collection(db, "users"), where("role", "==", "guru"));
            const teachersSnapshot = await getDocs(teachersQuery);
            const totalTeachers = teachersSnapshot.size;

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const attendanceQuery = query(
                collection(db, "photo_attendances"),
                where("role", "==", "guru"),
                where("checkInTime", ">=", todayStart),
                where("checkInTime", "<=", todayEnd)
            );
            const attendanceSnapshot = await getDocs(attendanceQuery);
            const presentToday = attendanceSnapshot.size;
            const fraudAlerts = attendanceSnapshot.docs.filter(doc => doc.data().isFraudulent).length;
            
            const settingsDoc = await getDoc(doc(db, "settings", "attendance"));
            let absentToday = 0;
            if (settingsDoc.exists()) {
                const settings = settingsDoc.data();
                const now = new Date();
                const todayStr = now.toLocaleDateString('en-US', { weekday: 'long' });
                const isOffDay = settings.offDays?.includes(todayStr);
                const checkInEndStr = settings.checkInEnd || '09:00';
                const [endHours, endMinutes] = checkInEndStr.split(':').map(Number);
                const checkInDeadline = new Date();
                checkInDeadline.setHours(endHours, endMinutes, 0, 0);

                if (!isOffDay && now > checkInDeadline) {
                    absentToday = totalTeachers - presentToday;
                }
            } else {
                 absentToday = totalTeachers - presentToday;
            }

            setStats({
                totalTeachers,
                presentToday,
                absentToday: absentToday > 0 ? absentToday : 0,
                fraudAlerts,
            });

        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
        } finally {
            setStatsLoading(false);
        }
    };

    fetchAttendance();
    fetchStats();
  }, []);
  
  if (!userProfile) return <CenteredLoader />;

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block">
        <SidebarProvider>
          <Sidebar side="left" collapsible="icon">
            <SidebarHeader>
              <Logo />
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive tooltip="Beranda">
                    <Home />
                    <span>Beranda</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Pengguna">
                    <Users2 />
                    <span>Pengguna</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Kehadiran">
                    <CheckSquare />
                    <span>Kehadiran</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Laporan">
                    <LineChart />
                    <span>Laporan</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <div className="flex flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-card px-4 sm:h-16 lg:px-6">
                    <SidebarTrigger className="sm:hidden" />
                    <Breadcrumb className="hidden md:flex">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="#">Beranda</Link>
                        </BreadcrumbLink>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                    </Breadcrumb>
                    <div className="relative ml-auto flex-1 md:grow-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Cari..."
                        className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                    />
                    </div>
                    <ThemeToggle />
                    <UserNav />
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Guru</CardTitle>
                            <Users2 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                            {statsLoading ? <Skeleton className="h-8 w-1/2" /> : (
                                <>
                                    <div className="text-2xl font-bold">{stats?.totalTeachers ?? 0}</div>
                                    <p className="text-xs text-muted-foreground">Total guru terdaftar</p>
                                </>
                            )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Guru Hadir Hari Ini</CardTitle>
                            <BookUser className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                            {statsLoading ? <Skeleton className="h-8 w-1/2" /> : (
                                <>
                                    <div className="text-2xl font-bold text-primary">{stats?.presentToday ?? 0}</div>
                                    <p className="text-xs text-muted-foreground">dari {stats?.totalTeachers ?? 0} guru</p>
                                </>
                            )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Guru Tidak Hadir Hari Ini</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                            {statsLoading ? <Skeleton className="h-8 w-1/2" /> : (
                                <>
                                    <div className="text-2xl font-bold text-destructive">{stats?.absentToday ?? 0}</div>
                                    <p className="text-xs text-muted-foreground">dari {stats?.totalTeachers ?? 0} guru</p>
                                </>
                            )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Peringatan Kecurangan</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                             {statsLoading ? <Skeleton className="h-8 w-1/2" /> : (
                                <>
                                    <div className="text-2xl font-bold text-destructive">{stats?.fraudAlerts ?? 0}</div>
                                    <p className="text-xs text-muted-foreground">Verifikasi manual diperlukan</p>
                                </>
                            )}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                    <Card className="xl:col-span-2">
                        <CardHeader>
                        <CardTitle>Aktivitas Guru Terbaru</CardTitle>
                        <CardDescription>
                            Catatan absensi masuk guru terbaru.
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
                                ) : (
                                    attendanceData.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                        <div className="font-medium">{item.name}</div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">{item.role}</TableCell>
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
                                )}
                            </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <AttendanceChart />
                    </div>
                </main>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
      
      {/* Mobile View */}
      <div className="md:hidden">
        <MobileAdminDashboard />
      </div>
    </>
  )
}
