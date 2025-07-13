
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Download, Eye, ChevronLeft, ChevronRight, Briefcase, BookCopy, Phone, Home, VenetianMask, BookMarked, Fingerprint, AlertTriangle, UserX, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { collection, query, where, onSnapshot, DocumentData, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '../ui/loader';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { App as CapacitorApp } from '@capacitor/app';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Guru' | 'Admin';
  avatar?: string;
  nip?: string;
  subject?: string;
  class?: string;
  gender?: string;
  phone?: string;
  religion?: string;
  address?: string;
}

interface ProcessedUser extends User {
  status: 'Hadir' | 'Terlambat' | 'Tidak Hadir' | 'Libur' | 'Guru' | 'Admin';
  isFraudulent?: boolean;
}

interface AttendanceStatus {
    status: ProcessedUser['status'];
    isFraudulent: boolean;
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

export default function UserManagement() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [processedUsers, setProcessedUsers] = useState<ProcessedUser[]>([]);
  const [absentUsers, setAbsentUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [attendanceStatusMap, setAttendanceStatusMap] = useState<Map<string, AttendanceStatus>>(new Map());
  const [settings, setSettings] = useState<any>(null);

  const [selectedUser, setSelectedUser] = useState<ProcessedUser | null>(null);
  const { toast } = useToast();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAbsentListOpen, setIsAbsentListOpen] = useState(false);
  const [backButtonListener, setBackButtonListener] = useState<PluginListenerHandle | null>(null);

  const removeListener = useCallback(() => {
    if (backButtonListener) {
      backButtonListener.remove();
      setBackButtonListener(null);
    }
  }, [backButtonListener]);

  const handleBackButton = useCallback((e: any) => {
    e.canGoBack = false;
    if (isDetailOpen) {
        setIsDetailOpen(false);
    } else if (isAbsentListOpen) {
        setIsAbsentListOpen(false);
    }
  }, [isDetailOpen, isAbsentListOpen]);
  
  useEffect(() => {
    const setupListener = async () => {
      if (Capacitor.isNativePlatform()) {
        if (backButtonListener) await backButtonListener.remove();
        const listener = await CapacitorApp.addListener('backButton', handleBackButton);
        setBackButtonListener(listener);
      }
    };
    setupListener();
    return () => { removeListener() };
  }, [handleBackButton, removeListener]);

  // Effect to fetch ALL users and listen for settings/attendance
  useEffect(() => {
    setLoading(true);

    const fetchAllUsers = async () => {
        try {
            const adminQuery = query(collection(db, "users"), where('role', '==', 'admin'));
            const teacherQuery = query(collection(db, "teachers"));

            const [adminSnapshot, teacherSnapshot] = await Promise.all([
                getDocs(adminQuery),
                getDocs(teacherQuery)
            ]);
            
            const adminUsers: User[] = adminSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), role: 'Admin' } as User));
            const teacherUsers: User[] = teacherSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), role: 'Guru' } as User));

            const combined = [...adminUsers, ...teacherUsers];
            setAllUsers(Array.from(new Map(combined.map(u => [u.id, u])).values()));
        } catch (error) {
            console.error("Error fetching all users:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Gagal memuat daftar pengguna.' });
        }
    };
    
    fetchAllUsers();
    
    const settingsRef = doc(db, "settings", "attendance");
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
        setSettings(docSnap.exists() ? docSnap.data() : {});
    }, (error) => {
        console.error("Error fetching settings: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Gagal memuat pengaturan.' });
    });
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const attendanceQuery = query(collection(db, "photo_attendances"), where("checkInTime", ">=", todayStart));
    
    const unsubAttendance = onSnapshot(attendanceQuery, (snapshot) => {
        const newMap = new Map<string, AttendanceStatus>();
        snapshot.forEach(doc => {
            const data = doc.data();
            newMap.set(data.userId, { status: data.status, isFraudulent: data.isFraudulent });
        });
        setAttendanceStatusMap(newMap);
    }, (error) => {
        console.error("Error fetching attendance: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Gagal memuat data kehadiran.' });
    });

    return () => {
      unsubSettings();
      unsubAttendance();
    }

  }, [toast]);
  
  // Effect to combine all data sources into processedUsers and absentUsers
  useEffect(() => {
    if (!settings || allUsers.length === 0) {
      if (allUsers.length > 0) setLoading(false);
      return;
    }

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-US', { weekday: 'long' });
    const isOffDay = settings.offDays?.includes(todayStr) ?? false;
    
    const usersWithStatus: ProcessedUser[] = allUsers.map(user => {
      let status: ProcessedUser['status'];
      const attendanceInfo = attendanceStatusMap.get(user.id);
      
      if (user.role === 'Admin') {
        status = 'Admin';
      } else if (isOffDay) {
        status = 'Libur';
      } else if (attendanceInfo) {
        status = attendanceInfo.status;
      } else {
        status = 'Guru';
      }
      
      return {
        ...user,
        status,
        isFraudulent: attendanceInfo?.isFraudulent ?? false,
      };
    }).sort((a, b) => {
        if (a.role === 'Admin' && b.role !== 'Admin') return -1;
        if (a.role !== 'Admin' && b.role === 'Admin') return 1;
        return (a.name || '').localeCompare(b.name || '');
    });

    const notCheckedInUsers = allUsers.filter(user => {
        if (user.role !== 'Guru' || isOffDay) {
            return false;
        }
        return !attendanceStatusMap.has(user.id);
    });

    setAbsentUsers(notCheckedInUsers);
    setProcessedUsers(usersWithStatus);
    setLoading(false);
  }, [allUsers, attendanceStatusMap, settings]);

  const displayedUsers = useMemo(() => {
    const filtered = searchTerm
      ? processedUsers.filter(user => user.name?.toLowerCase().includes(searchTerm.toLowerCase()))
      : processedUsers;
    
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + USERS_PER_PAGE);
  }, [processedUsers, searchTerm, currentPage]);

  const totalFilteredCount = useMemo(() => {
      return searchTerm
      ? processedUsers.filter(user => user.name?.toLowerCase().includes(searchTerm.toLowerCase())).length
      : processedUsers.length;
  }, [processedUsers, searchTerm]);


  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      setCurrentPage(1); 
  };


  const handleNextPage = () => {
    if ((currentPage * USERS_PER_PAGE) < totalFilteredCount) {
        setCurrentPage(prev => prev + 1);
    }
  };
  const handlePrevPage = () => {
    if (currentPage > 1) {
        setCurrentPage(prev => prev - 1);
    }
  };

  const getBadgeVariant = (status: ProcessedUser['status']) => {
    switch (status) {
        case 'Hadir': return 'success';
        case 'Terlambat': return 'warning';
        case 'Tidak Hadir': return 'destructive';
        case 'Libur':
        case 'Guru':
            return 'secondary';
        case 'Admin':
            return 'info';
        default: return 'outline';
    }
  }

  const handleDownload = async (formatType: 'pdf' | 'csv') => {
    toast({ title: 'Mempersiapkan Unduhan...', description: 'Ini bisa memakan waktu beberapa saat.' });

    try {
        if (processedUsers.length === 0) {
            toast({ variant: 'destructive', title: 'Gagal Mengunduh', description: 'Tidak ada data pengguna untuk diunduh.' });
            return;
        }

        const headers = ['ID', 'Nama', 'Email', 'Peran', 'Status Hari Ini', 'NIP', 'Mata Pelajaran', 'Kelas', 'Jenis Kelamin', 'Telepon', 'Agama', 'Alamat'];
        const data = processedUsers.map(user => [
            user.id,
            user.name,
            user.email,
            user.role,
            user.status,
            user.nip || '',
            user.subject || '',
            user.class || '',
            user.gender || '',
            user.phone || '',
            user.religion || '',
            user.address || ''
        ]);

        const filename = `Laporan_Pengguna_Lengkap.${formatType}`;

        if (Capacitor.isNativePlatform()) {
            let fileData: string;
            if (formatType === 'csv') {
                const csvData = data.map(row => row.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(','));
                const csvContent = [headers.join(','), ...csvData].join('\n');
                fileData = btoa(unescape(encodeURIComponent(csvContent)));
            } else { 
                const { default: jsPDF } = await import('jspdf');
                const { default: autoTable } = await import('jspdf-autotable');
                const doc = new jsPDF();
                doc.text('Laporan Pengguna Lengkap', 14, 16);
                autoTable(doc, { head: [headers], body: data.map(row => row.map(field => String(field || ''))), startY: 20, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [22, 163, 74] } });
                const dataUri = doc.output('datauristring');
                fileData = dataUri.substring(dataUri.indexOf(',') + 1);
            }

            await Filesystem.writeFile({
                path: filename,
                data: fileData,
                directory: Directory.Documents,
                recursive: true
            });

            toast({
                title: "Unduhan Selesai",
                description: `${filename} disimpan di folder Dokumen perangkat Anda.`,
            });

        } else {
            if (formatType === 'csv') {
              const csvData = data.map(row => row.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(','));
              const csvContent = [headers.join(','), ...csvData].join('\n');
              const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', filename);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
        
            if (formatType === 'pdf') {
              const { default: jsPDF } = await import('jspdf');
              const { default: autoTable } = await import('jspdf-autotable');
        
              const doc = new jsPDF();
              doc.text('Laporan Pengguna Lengkap', 14, 16);
              autoTable(doc, {
                  head: [headers],
                  body: data.map(row => row.map(field => String(field || ''))),
                  startY: 20,
                  theme: 'grid',
                  styles: { fontSize: 8 },
                  headStyles: { fillColor: [22, 163, 74] },
              });
              doc.save(filename);
            }
        }
    } catch (error) {
        console.error("Error during download: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Gagal mengunduh data.' });
    }
  };

  const handleOpenDetailDialog = (user: ProcessedUser) => {
    setSelectedUser(user);
    setIsDetailOpen(true);
  };

  const handleCloseDetailDialog = () => {
    setIsDetailOpen(false);
    setSelectedUser(null);
  };
  
  const handleCloseAbsentDialog = () => {
    setIsAbsentListOpen(false);
  }

  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage * USERS_PER_PAGE < totalFilteredCount;

  return (
    <>
      <div className="bg-gray-50 dark:bg-zinc-900">
        <header className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h1 className="text-xl font-bold text-foreground">Manajemen Pengguna</h1>
        </header>

        <div className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
              <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    placeholder="Cari pengguna..." 
                    className="pl-10 w-full" 
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
              </div>
              <div className='flex items-center gap-2 w-full sm:w-auto'>
                  <Button variant="outline" size="icon" className="w-full sm:w-auto">
                      <UserPlus className="h-4 w-4" />
                      <span className="sr-only">Tambah Pengguna</span>
                  </Button>
                  <div className='flex gap-2 flex-grow'>
                      <Button variant="outline" className="w-full" onClick={() => setIsAbsentListOpen(true)}>
                          <UserX className="mr-2 h-4 w-4" />
                          Belum Absen
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-auto px-3">
                              <Download className="h-4 w-4" />
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
              </div>
          </div>

          {loading ? (
              <div className="flex justify-center items-center h-64">
                  <Loader scale={1.6} />
              </div>
          ) : (
              <>
              <div className="space-y-3">
                  {displayedUsers.length > 0 ? (
                      displayedUsers.map((user) => (
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
                                  <Button variant="ghost" size="icon" className="h-9 w-9 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200" onClick={() => handleOpenDetailDialog(user)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                              </div>
                          </div>
                      </Card>
                  ))
                  ) : (
                      <p className="text-center text-muted-foreground py-8">Tidak ada pengguna yang ditemukan.</p>
                  )}
              </div>
              
              {(hasPrevPage || hasNextPage) && (
                <div className="flex items-center justify-center space-x-2 mt-6">
                    <Button variant="outline" onClick={handlePrevPage} disabled={!hasPrevPage}>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Sebelumnya
                    </Button>
                    <Button variant="outline" onClick={handleNextPage} disabled={!hasNextPage}>
                        Berikutnya
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
              )}

              </>
          )}
        </div>
      </div>
      <Dialog open={isDetailOpen} onOpenChange={handleCloseDetailDialog}>
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
                    <div className="space-y-3 text-sm">
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
      <Dialog open={isAbsentListOpen} onOpenChange={handleCloseAbsentDialog}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Guru yang Belum Absen</DialogTitle>
                <DialogDescription>
                    Berikut adalah daftar guru yang belum melakukan absensi hari ini.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] -mx-6">
                <div className="px-6 py-4 space-y-3">
                    {absentUsers.length > 0 ? (
                        absentUsers.map(user => (
                            <div key={user.id} className="flex items-center gap-4 p-2 rounded-md border">
                                <Avatar>
                                    <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person portrait" />
                                    <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-foreground">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-8">Semua guru telah melakukan absensi hari ini.</p>
                    )}
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

    
