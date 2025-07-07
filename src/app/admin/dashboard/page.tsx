'use client';

import { useEffect, useState } from "react";
import { Home, LineChart, Search, Users2, BookUser, Users, AlertTriangle, GraduationCap, Briefcase } from "lucide-react"
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
import { collection, getDocs, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CenteredLottieLoader, LottieLoader } from "@/components/ui/lottie-loader";

interface AttendanceRecord {
    id: string;
    name: string;
    role: string;
    checkInTime: Timestamp;
    status: 'Hadir' | 'Terlambat' | 'Penipuan' | 'Absen';
    location: string;
}

export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Implement real-time data fetching from Firestore
    const fetchAttendance = async () => {
        try {
            const q = query(collection(db, "photo_attendances"), orderBy("checkInTime", "desc"), limit(10));
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
    fetchAttendance();
  }, []);
  
  if (!userProfile) return <CenteredLottieLoader />;

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
                  <SidebarMenuButton isActive tooltip="Dasbor">
                    <Home />
                    <span>Dasbor</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Siswa">
                    <GraduationCap />
                    <span>Siswa</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Guru">
                    <Briefcase />
                    <span>Guru</span>
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
                            <Link href="#">Dasbor</Link>
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
                    <UserNav />
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
                        <Users2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        {/* TODO: Fetch data from Firestore */}
                        <div className="text-2xl font-bold">450</div>
                        <p className="text-xs text-muted-foreground">380 Siswa, 70 Guru</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Hadir Hari Ini</CardTitle>
                        <BookUser className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold text-primary">370</div>
                        <p className="text-xs text-muted-foreground">+5% dari kemarin</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Absen Hari Ini</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold text-destructive">10</div>
                        <p className="text-xs text-muted-foreground">2.6% dari siswa</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Peringatan Penipuan</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold text-destructive">1</div>
                        <p className="text-xs text-muted-foreground">Verifikasi manual diperlukan</p>
                        </CardContent>
                    </Card>
                    </div>
                    <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                    <Card className="xl:col-span-2">
                        <CardHeader>
                        <CardTitle>Aktivitas Terbaru</CardTitle>
                        <CardDescription>
                            Catatan absensi masuk terbaru.
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
                                <TableHead className="hidden md:table-cell">Lokasi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={5} className="py-8"><div className="flex justify-center"><LottieLoader size={40}/></div></TableCell></TableRow>
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
                                            item.status === 'Hadir' ? 'default' :
                                            item.status === 'Terlambat' ? 'secondary' : 'destructive'
                                        }>{item.status}</Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">{item.location}</TableCell>
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
