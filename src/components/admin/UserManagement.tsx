
'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { collection, getDocs, query, where, doc, getDoc, onSnapshot, orderBy, limit, startAfter, endBefore, limitToLast, QueryDocumentSnapshot } from 'firebase/firestore';
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
  
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageDirection, setPageDirection] = useState<'next' | 'prev' | null>(null);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [backButtonListener, setBackButtonListener] = useState<PluginListenerHandle | null>(null);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const removeListener = useCallback(() => {
    if (backButtonListener) {
      backButtonListener.remove();
      setBackButtonListener(null);
    }
  }, [backButtonListener]);

  const handleBackButton = useCallback((e: any) => {
    e.canGoBack = false;
    if(isDetailOpen) {
        setIsDetailOpen(false);
    }
  }, [isDetailOpen]);
  
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

  const fetchUsers = useCallback(async (direction: 'next' | 'prev' | null = null, searchQuery = searchTerm) => {
    setLoading(true);
    setPageDirection(direction);

    try {
        const collections = ['teachers', 'users'];
        const attendanceStatusMap = new Map<string, any>();
        
        // Fetch today's attendance once
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const attendanceQuery = query(collection(db, "photo_attendances"), where("checkInTime", ">=", todayStart));
        const attendanceSnapshot = await getDocs(attendanceQuery);
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            attendanceStatusMap.set(data.userId, { status: data.status, isFraudulent: data.isFraudulent });
        });

        const settingsDoc = await getDoc(doc(db, "settings", "attendance"));
        const settings = settingsDoc.exists() ? settingsDoc.data() : {};
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

        let allUsers: User[] = [];

        for (const col of collections) {
            let q = query(collection(db, col), orderBy('name'));

            if (searchQuery) {
                q = query(q, where('name', '>=', searchQuery), where('name', '<=', searchQuery + '\uf8ff'));
            }

            if (direction === 'next' && lastVisible) {
                q = query(q, startAfter(lastVisible), limit(USERS_PER_PAGE));
            } else if (direction === 'prev' && firstVisible) {
                q = query(q, endBefore(firstVisible), limitToLast(USERS_PER_PAGE));
            } else if (!direction) { // First load or search
                q = query(q, limit(USERS_PER_PAGE));
            }

            const querySnapshot = await getDocs(q);
            const docs = querySnapshot.docs;

            if (!docs.length && direction) {
                setLoading(false);
                return; // No more pages
            }

            setFirstVisible(docs[0] || null);
            setLastVisible(docs[docs.length - 1] || null);
            
            const fetchedUsers = docs.map(doc => {
              const data = doc.data();
              let status: User['status'];
              const attendanceInfo = attendanceStatusMap.get(doc.id);

              if (data.role === 'admin') {
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
                id: doc.id,
                name: data.name,
                email: data.email,
                avatar: data.avatar || '',
                role: data.role === 'admin' ? 'Admin' : 'Guru',
                status,
                isFraudulent: attendanceInfo?.isFraudulent ?? false,
                nip: data.nip,
                subject: data.subject,
                class: data.class,
                gender: data.gender,
                phone: data.phone,
                religion: data.religion,
                address: data.address,
              };
            });
            allUsers.push(...fetchedUsers);
        }

        allUsers.sort((a, b) => {
            if (a.role === 'Admin' && b.role !== 'Admin') return -1;
            if (a.role !== 'Admin' && b.role === 'Admin') return 1;
            return a.name.localeCompare(b.name);
        });

        setUsers(allUsers.slice(0, USERS_PER_PAGE));

    } catch (error) {
        console.error("Error fetching users:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Gagal memuat data pengguna.' });
    } finally {
        setLoading(false);
        setPageDirection(null);
    }
  }, [searchTerm, toast, lastVisible, firstVisible]);

  useEffect(() => {
    if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
        setCurrentPage(1);
        setLastVisible(null);
        setFirstVisible(null);
        fetchUsers(null, searchTerm);
    }, 500); // 500ms debounce
    
    return () => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleNextPage = () => {
    if (lastVisible) {
        setCurrentPage(prev => prev + 1);
        fetchUsers('next');
    }
  };
  const handlePrevPage = () => {
    if (currentPage > 1) {
        setCurrentPage(prev => prev - 1);
        fetchUsers('prev');
    }
  };

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
    toast({ title: 'Mempersiapkan Unduhan...', description: 'Ini bisa memakan waktu beberapa saat.' });

    try {
        const collectionsToFetch = ['teachers', 'users'];
        let allUsersData: any[] = [];
        for (const col of collectionsToFetch) {
            const q = query(collection(db, col));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => allUsersData.push({ id: doc.id, ...doc.data() }));
        }

        if (allUsersData.length === 0) {
            toast({ variant: 'destructive', title: 'Gagal Mengunduh', description: 'Tidak ada data pengguna untuk diunduh.' });
            return;
        }

        const headers = ['ID', 'Nama', 'Email', 'Peran', 'NIP', 'Mata Pelajaran', 'Kelas', 'Jenis Kelamin', 'Telepon', 'Agama', 'Alamat'];
        const data = allUsersData.map(user => [
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

  const handleOpenDetailDialog = (user: User) => {
    setSelectedUser(user);
    setIsDetailOpen(true);
  };

  const handleCloseDetailDialog = () => {
    setIsDetailOpen(false);
    setSelectedUser(null);
  };

  return (
    <>
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

          {loading && (!users.length || pageDirection) ? (
              <div className="flex justify-center items-center h-64">
                  <Loader scale={1.6} />
              </div>
          ) : (
              <>
              <div className="space-y-3">
                  {users.length > 0 ? (
                      users.map((user) => (
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
              
              <div className="flex items-center justify-center space-x-2 mt-6">
                <Button variant="outline" onClick={handlePrevPage} disabled={currentPage === 1 || loading}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Sebelumnya
                </Button>
                <Button variant="outline" onClick={handleNextPage} disabled={!lastVisible || users.length < USERS_PER_PAGE || loading}>
                    Berikutnya
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

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
    </>
  );
}
