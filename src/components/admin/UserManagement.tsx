
'use client'

import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Download, Eye, ChevronLeft, ChevronRight, Briefcase, BookCopy, Phone, Home, VenetianMask, BookMarked, Fingerprint, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { collection, getDocs, query, where, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '../ui/loader';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Guru' | 'Admin';
  status: 'Hadir' | 'Terlambat' | 'Tidak Hadir' | 'Libur' | 'Belum Absen' | 'Admin';
  avatar: string;
  isFraudulent?: boolean;
  nip?: string;
  subject?: string;
  class?: string;
  gender?: string;
  phone?: string;
  religion?: string;
  address?: string;
}

const USERS_PER_PAGE = 10;

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 text-muted-foreground">
            <Icon className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="min-w-0">
                <span>{label}: <strong className="text-foreground break-words">{value}</strong></span>
            </div>
        </div>
    );
};

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsersAndListenForStatus = async () => {
      setLoading(true);
      try {
        // Fetch teachers from 'teachers' collection
        const teachersQuery = collection(db, 'teachers');
        const teachersSnapshot = await getDocs(teachersQuery);
        const teacherUsers = teachersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          role: 'Guru',
        }));

        // Fetch admins from 'users' collection
        const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
        const adminsSnapshot = await getDocs(adminsQuery);
        const adminUsers = adminsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          role: 'Admin',
        }));

        const allBaseUsers = [...teacherUsers, ...adminUsers] as any[];

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const attendanceQuery = query(
          collection(db, "photo_attendances"),
          where("checkInTime", ">=", todayStart),
          where("checkInTime", "<=", todayEnd)
        );

        const settingsDoc = await getDoc(doc(db, "settings", "attendance"));
        const settings = settingsDoc.exists() ? settingsDoc.data() : {};
        
        const unsubscribeAttendance = onSnapshot(attendanceQuery, (attendanceSnapshot) => {
          const now = new Date();
          const todayStr = now.toLocaleDateString('en-US', { weekday: 'long' });
          const isOffDay = settings.offDays?.includes(todayStr) ?? false;
          
          const checkInEndStr = settings.checkInEnd || '09:00';
          const gracePeriodMinutes = settings.gracePeriod ?? 60;
          const [endHours, endMinutes] = checkInEndStr.split(':').map(Number);
          const checkInDeadline = new Date();
          checkInDeadline.setHours(endHours, endMinutes, 0, 0);
          const checkInGraceEnd = new Date(checkInDeadline.getTime() + gracePeriodMinutes * 60 * 1000);
          const isPastAbsentDeadline = now > checkInGraceEnd;

          const attendanceStatusMap = new Map<string, any>();
          attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.userId) {
              attendanceStatusMap.set(data.userId, { status: data.status, isFraudulent: data.isFraudulent });
            }
          });

          const usersWithStatus: User[] = allBaseUsers.map((user: any) => {
            let status: User['status'];
            const attendanceInfo = attendanceStatusMap.get(user.id);
            
            if (user.role === 'Admin') {
                status = 'Admin';
            } else if (attendanceInfo) {
              status = attendanceInfo.status;
            } else if (isOffDay) {
              status = 'Libur';
            } else if (isPastAbsentDeadline) {
              status = 'Tidak Hadir';
            } else {
              status = 'Belum Absen';
            }
            
            return {
              ...user,
              status,
              isFraudulent: attendanceInfo?.isFraudulent ?? false,
            };
          });

          usersWithStatus.sort((a, b) => {
            if (a.role === 'Admin' && b.role !== 'Admin') return -1;
            if (a.role !== 'Admin' && b.role === 'Admin') return 1;
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB);
          });

          setUsers(usersWithStatus);
          setLoading(false);
        }, (error) => {
          console.error("Error in attendance onSnapshot listener: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Gagal memuat status kehadiran secara real-time.' });
          setUsers([]);
          setLoading(false);
        });

        return () => unsubscribeAttendance();

      } catch (error) {
        console.error("Error fetching users:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Gagal memuat data pengguna.' });
        setUsers([]);
        setLoading(false);
        return () => {};
      }
    };

    fetchUsersAndListenForStatus();
    
    return () => {
      // No-op for now, as unsubscribe is handled inside the listener setup
    };
  }, [toast]);

  const filteredUsers = useMemo(() => {
    setCurrentPage(1);
    if (!searchTerm) {
        return users;
    }
    return users.filter(user => {
      return user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
      const startIndex = (currentPage - 1) * USERS_PER_PAGE;
      return filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const paginationRange = useMemo(() => {
    const siblingCount = 1;
    const totalPageNumbers = siblingCount + 5;

    if (totalPageNumbers >= totalPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, '...', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;
      let rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + i + 1);
      return [firstPageIndex, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = [];
        for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
            middleRange.push(i);
        }
      return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
    }
  }, [totalPages, currentPage]);
  
  const getBadgeVariant = (status: User['status']) => {
    switch (status) {
        case 'Hadir': return 'success';
        case 'Terlambat': return 'warning';
        case 'Tidak Hadir': return 'destructive';
        case 'Libur':
        case 'Belum Absen':
            return 'secondary';
        case 'Admin':
            return 'info';
        default: return 'outline';
    }
  }

  const handleDownload = async (formatType: 'pdf' | 'csv') => {
    if (loading || filteredUsers.length === 0) {
        toast({
            variant: 'destructive',
            title: 'Gagal Mengunduh',
            description: 'Tidak ada data pengguna untuk diunduh.',
        });
        return;
    }

    toast({
        title: 'Mempersiapkan Unduhan',
        description: `Daftar pengguna akan segera diunduh sebagai ${formatType.toUpperCase()}.`,
    });

    const headers = ['ID', 'Nama', 'Email', 'Peran', 'NIP', 'Mata Pelajaran', 'Kelas', 'Jenis Kelamin', 'Telepon', 'Agama', 'Alamat'];
    const data = filteredUsers.map(user => [
        user.id,
        user.name,
        user.email,
        user.role,
        user.nip || '',
        user.subject || '',
        user.class || '',
        user.gender || '',
        user.phone || '',
        user.religion || '',
        user.address || ''
    ]);

    const filename = 'Laporan_Pengguna';

    if (formatType === 'csv') {
      const csvData = data.map(row => row.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(','));
      const csvContent = [headers.join(','), ...csvData].join('\n');
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

    if (formatType === 'pdf') {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      doc.text('Laporan Pengguna', 14, 16);
      autoTable(doc, {
          head: [headers],
          body: data.map(row => row.map(field => String(field || ''))),
          startY: 20,
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [22, 163, 74] },
      });
      doc.save(`${filename}.pdf`);
    }
  };


  return (
    <Dialog onOpenChange={(open) => !open && setSelectedUser(null)}>
      <div className="bg-gray-50 dark:bg-zinc-900">
        <header className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h1 className="text-xl font-bold text-foreground">Manajemen Pengguna</h1>
        </header>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Cari pengguna..." 
                  className="pl-10 w-full" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Unduh
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => handleDownload('pdf')}>
                      Unduh sebagai PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleDownload('csv')}>
                      Unduh sebagai CSV
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {loading ? (
              <div className="flex justify-center items-center h-64">
                  <Loader scale={1.6} />
              </div>
          ) : (
              <>
              <div className="space-y-3">
                  {paginatedUsers.length > 0 ? (
                      paginatedUsers.map((user) => (
                      <Card key={user.id} className="p-3">
                          <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12">
                                  <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person portrait" />
                                  <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-grow min-w-0">
                                  <p className="font-semibold text-foreground truncate">{user.name}</p>
                                  <p className="text-sm text-muted-foreground -mt-1 truncate">{user.email}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {user.role === 'Admin' ? (
                                      <div className="glowing-admin-badge">Admin</div>
                                    ) : (
                                      <Badge variant={getBadgeVariant(user.status)}>
                                        {user.isFraudulent && <AlertTriangle className="h-3 w-3 mr-1.5 animate-medium-flash" />}
                                        {user.status}
                                      </Badge>
                                    )}
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-9 w-9 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200" onClick={() => setSelectedUser(user)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                              </div>
                          </div>
                      </Card>
                  ))
                  ) : (
                      <p className="text-center text-muted-foreground py-8">Tidak ada pengguna yang ditemukan.</p>
                  )}
              </div>

              {totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-1 mt-6">
                      <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="text-primary"
                      >
                      <ChevronLeft className="h-5 w-5" />
                      </Button>
                      {paginationRange?.map((page, index) =>
                      page === '...' ? (
                          <span key={`ellipsis-${index}`} className="px-2 py-1 text-muted-foreground">
                          ...
                          </span>
                      ) : (
                          <Button
                          key={page}
                          variant="ghost"
                          size="icon"
                          onClick={() => setCurrentPage(page as number)}
                          className={cn(
                              'h-9 w-9',
                              currentPage === page
                              ? 'font-bold text-primary underline decoration-2 underline-offset-4'
                              : 'text-muted-foreground'
                          )}
                          >
                          {page}
                          </Button>
                      )
                      )}
                      <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="text-primary"
                      >
                      <ChevronRight className="h-5 w-5" />
                      </Button>
                  </div>
              )}
              </>
          )}
        </div>
      </div>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detail Pengguna</DialogTitle>
        </DialogHeader>
        {selectedUser && (
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="flex flex-col gap-4 py-4">
              <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
                      <AvatarFallback>{selectedUser.name?.slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                      <p className="text-xl font-bold text-foreground">{selectedUser.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{selectedUser.role}</p>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
              </div>
              <Separator />
              <div className="space-y-3 text-sm">
                  <h3 className="font-semibold text-md mb-2">Informasi Pribadi</h3>
                  {selectedUser.role === 'Guru' && <DetailItem icon={Fingerprint} label="NIP" value={selectedUser.nip} />}
                  <DetailItem icon={VenetianMask} label="Jenis Kelamin" value={selectedUser.gender} />
                  <DetailItem icon={Phone} label="No. Telepon" value={selectedUser.phone} />
                  <DetailItem icon={BookMarked} label="Agama" value={selectedUser.religion} />
                  <DetailItem icon={Home} label="Alamat" value={selectedUser.address} />
              </div>
              {selectedUser.role === 'Guru' && (
                  <>
                      <Separator />
                      <div className="space-y-3 text-sm mt-4">
                          <h3 className="font-semibold text-md mb-2">Informasi Akademik</h3>
                          <DetailItem icon={BookCopy} label="Mata Pelajaran" value={selectedUser.subject} />
                          <DetailItem icon={Briefcase} label="Mengajar Kelas" value={selectedUser.class} />
                      </div>
                  </>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
