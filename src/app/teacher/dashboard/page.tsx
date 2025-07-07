'use client';

import { Home, LineChart, Search, GraduationCap, BookOpen } from "lucide-react"
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

// Mock data for teacher dashboard
const studentAttendanceData = [
    { name: "Alex Doe", time: "08:01 AM", status: "Present" },
    { name: "Samantha Bee", time: "08:03 AM", status: "Present" },
    { name: "Jane Roe", time: "09:00 AM", status: "Fraudulent" },
    { name: "Michael Brown", time: "-", status: "Absent" },
    { name: "Emily Davis", time: "-", status: "Absent" },
];

export default function TeacherDashboard() {
  const user = { name: "John Smith", role: "Teacher" as const, avatar: "https://placehold.co/100x100.png", subject: "Mathematics" };
  
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
                  <SidebarMenuButton isActive tooltip="Dashboard">
                    <Home />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="My Classes">
                    <BookOpen />
                    <span>My Classes</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Students">
                    <GraduationCap />
                    <span>Students</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Reports">
                    <LineChart />
                    <span>Reports</span>
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
                            <Link href="#">Dashboard</Link>
                        </BreadcrumbLink>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                    </Breadcrumb>
                    <div className="relative ml-auto flex-1 md:grow-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search students..."
                        className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                    />
                    </div>
                    <UserNav user={user} />
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">45</div>
                                <p className="text-xs text-muted-foreground">in your classes</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                                <GraduationCap className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-primary">40</div>
                                <p className="text-xs text-muted-foreground">in your current class</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
                                <GraduationCap className="h-4 w-4 text-destructive" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-destructive">5</div>
                                <p className="text-xs text-muted-foreground">incl. 2 late</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Your Schedule</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                            <div className="text-2xl font-bold">10:00 AM</div>
                            <p className="text-xs text-muted-foreground">Next class: Math 10B</p>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                            <CardTitle>Today's Attendance - Math 10B</CardTitle>
                            <CardDescription>
                                A log of student attendance for your class today.
                            </CardDescription>
                            </CardHeader>
                            <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead className="hidden sm:table-cell">Check-in Time</TableHead>
                                    <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {studentAttendanceData.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                        <div className="font-medium">{item.name}</div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">{item.time}</TableCell>
                                        <TableCell>
                                        <Badge variant={
                                            item.status === 'Present' ? 'default' :
                                            item.status === 'Late' ? 'secondary' : 
                                            item.status === 'Absent' ? 'outline' : 'destructive'
                                        }>{item.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <div className="lg:col-span-1">
                            <CheckinCard user={user} />
                        </div>
                    </div>
                </main>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
      
      {/* Mobile View */}
      <div className="md:hidden">
        <MobileTeacherDashboard user={user} />
      </div>
    </>
  );
}
