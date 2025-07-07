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

const attendanceData = [
    { name: "Alex Doe", role: "Student", time: "08:01 AM", status: "Present", location: "On-site" },
    { name: "Samantha Bee", role: "Student", time: "08:03 AM", status: "Present", location: "On-site" },
    { name: "Dr. Evelyn Reed", role: "Teacher", time: "07:55 AM", status: "Present", location: "On-site" },
    { name: "John Smith", role: "Student", time: "08:15 AM", status: "Late", location: "On-site" },
    { name: "Jane Roe", role: "Student", time: "09:00 AM", status: "Fraudulent", location: "Off-site" },
    { name: "Mike Ross", role: "Teacher", time: "07:45 AM", status: "Present", location: "On-site" },
];

export default function AdminDashboard() {
  const adminUser = { name: "Admin User", role: "Admin" as const, avatar: "https://placehold.co/100x100.png" };
  
  return (
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
              <SidebarMenuButton tooltip="Students">
                <GraduationCap />
                <span>Students</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton tooltip="Teachers">
                <Briefcase />
                <span>Teachers</span>
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
        <div className="flex flex-col">
            <header className="flex h-14 items-center gap-4 border-b bg-card px-4 sm:h-16 lg:px-6">
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
                    placeholder="Search..."
                    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                />
                </div>
                <UserNav user={adminUser} />
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">450</div>
                    <p className="text-xs text-muted-foreground">380 Students, 70 Teachers</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                    <BookUser className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold text-primary">370</div>
                    <p className="text-xs text-muted-foreground">+5% from yesterday</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold text-destructive">10</div>
                    <p className="text-xs text-muted-foreground">2.6% of students</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fraud Alerts</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold text-destructive">1</div>
                    <p className="text-xs text-muted-foreground">Manual verification needed</p>
                    </CardContent>
                </Card>
                </div>
                <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                        A log of the latest attendance check-ins.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead className="hidden sm:table-cell">Role</TableHead>
                            <TableHead className="hidden sm:table-cell">Time</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden md:table-cell">Location</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attendanceData.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                <div className="font-medium">{item.name}</div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">{item.role}</TableCell>
                                <TableCell className="hidden sm:table-cell">{item.time}</TableCell>
                                <TableCell>
                                <Badge variant={
                                    item.status === 'Present' ? 'default' :
                                    item.status === 'Late' ? 'secondary' : 'destructive'
                                }>{item.status}</Badge>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">{item.location}</TableCell>
                            </TableRow>
                            ))}
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
  )
}
