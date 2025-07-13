
'use client';

import { useEffect, useState } from "react";
import { Home, LineChart, Search, GraduationCap, BookOpen, Users } from "lucide-react"
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
import { MobileTeacherDashboard } from "@/components/teacher/MobileTeacherDashboard"
import { CheckinCard } from "@/components/check-in/CheckinCard"
import { useAuth } from "@/hooks/useAuth";
import { collection, query, where, getDocs, Timestamp, onSnapshot, orderBy, startOfToday, endOfToday } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CenteredLoader, Loader } from "@/components/ui/loader";
import { ThemeToggle } from "@/components/ThemeToggle";

interface StudentAttendanceRecord {
    id: string;
    name: string;
    checkInTime: Timestamp;
    status: 'Hadir' | 'Terlambat' | 'Absen';
    isFraudulent?: boolean;
}

export default function TeacherDashboard() {
  const { userProfile } = useAuth();
  const [studentAttendanceData, setStudentAttendanceData] = useState<StudentAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile || !userProfile.subject) return;

    setLoading(true);
    // TODO: This query assumes students have a `class` field that matches the teacher's subject.
    // This might need adjustment based on your actual data structure.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, "photo_attendances"),
      where("role", "==", "siswa"),
      // where("className", "==", userProfile.subject), // Assuming teacher's subject matches a class name
      where("checkInTime", ">=", todayStart),
      where("checkInTime", "<=", todayEnd),
      orderBy("checkInTime", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          checkInTime: doc.data().checkInTime,
      })) as StudentAttendanceRecord[];
      setStudentAttendanceData(data);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching student attendance: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);
  
  if (!userProfile) {
      return <CenteredLoader />
  }

  const user = {
    name: userProfile.name,
    role: "Guru" as const,
    avatar: userProfile.avatar || "https://placehold.co/100x100.png",
    subject: userProfile.subject || "Tidak diketahui"
  };
  
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
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
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
                        placeholder="Cari siswa..."
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
                                <CardTitle className="text-sm font-medium">Total Siswa</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {/* TODO: Fetch data from Firestore */}
                                <div className="text-2xl font-bold">45</div>
                                <p className="text-xs text-muted-foreground">di kelas Anda</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Hadir Hari Ini</CardTitle>
                                <GraduationCap className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-primary">{studentAttendanceData.filter(s => s.status === 'Hadir').length}</div>
                                <p className="text-xs text-muted-foreground">di kelas Anda saat ini</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Absen Hari Ini</CardTitle>
                                <GraduationCap className="h-4 w-4 text-destructive" />
                            </CardHeader>
                            <CardContent>
                                 {/* TODO: This needs to be calculated based on total students */}
                                <div className="text-2xl font-bold text-destructive">5</div>
                                <p className="text-xs text-muted-foreground">termasuk {studentAttendanceData.filter(s => s.status === 'Terlambat').length} terlambat</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Jadwal Anda</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                            <div className="text-2xl font-bold">10:00 AM</div>
                            <p className="text-xs text-muted-foreground">Kelas berikutnya: Matematika 10B</p>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                            <CardTitle>Absensi Hari Ini - {user.subject}</CardTitle>
                            <CardDescription>
                                Catatan kehadiran siswa untuk kelas Anda hari ini.
                            </CardDescription>
                            </CardHeader>
                            <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Siswa</TableHead>
                                    <TableHead className="hidden sm:table-cell">Waktu Absen Masuk</TableHead>
                                    <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading && <TableRow><TableCell colSpan={3} className="py-8"><div className="flex justify-center"><Loader scale={0.8}/></div></TableCell></TableRow>}
                                    {!loading && studentAttendanceData.length === 0 && <TableRow><TableCell colSpan={3}>Belum ada data absensi hari ini.</TableCell></TableRow>}
                                    {!loading && studentAttendanceData.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                        <div className="font-medium">{item.name}</div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">{item.checkInTime.toDate().toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'})}</TableCell>
                                        <TableCell>
                                        <Badge variant={
                                            item.isFraudulent ? 'destructive' :
                                            item.status === 'Hadir' ? 'success' :
                                            item.status === 'Terlambat' ? 'warning' : 
                                            item.status === 'Absen' ? 'outline' : 'destructive'
                                        }>{item.isFraudulent ? 'Penipuan' : item.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <div className="lg:col-span-1">
                            <CheckinCard />
                        </div>
                    </div>
                </main>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
      
      {/* Mobile View */}
      <div className="md:hidden">
        <MobileTeacherDashboard />
      </div>
    </>
  );
}
