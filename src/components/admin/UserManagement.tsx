
'use client'

import { useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Download, Eye, ChevronLeft, ChevronRight, Briefcase, BookCopy, Phone, Home, VenetianMask, BookMarked, Fingerprint, AlertTriangle, UserX, UserPlus, MoreVertical, Trash2, Edit as EditIcon, ArrowLeft, EyeOff } from 'lucide-react';
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { collection, query, where, onSnapshot, DocumentData, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '../ui/loader';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { App as CapacitorApp } from '@capacitor/app';
import { AddUserDialog } from './AddUserDialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateUser, type UpdateUserState } from '@/app/actions';
import { useAuth } from '@/hooks/useAuth';


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

// Form schema for Edit
const updateUserFormSchema = z.object({
  name: z.string().min(3, "Nama harus memiliki setidaknya 3 karakter."),
  password: z.string().optional(),
  nip: z.string().optional(),
  gender: z.enum(['Laki-laki', 'Perempuan', '']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  subject: z.string().optional(),
  class: z.string().optional(),
}).refine(data => !data.password || data.password.length >= 6, {
  message: "Kata sandi baru harus memiliki setidaknya 6 karakter.",
  path: ["password"],
});

type UpdateUserFormValues = z.infer<typeof updateUserFormSchema>;


// The new Edit User Form Component
function EditUserForm({ user, onBack, onSuccess }: { user: User, onBack: () => void, onSuccess: () => void }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [showPassword, setShowPassword] = useState(false);
    const { userProfile: currentUser } = useAuth();

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isDirty },
    } = useForm<UpdateUserFormValues>({
        resolver: zodResolver(updateUserFormSchema),
        defaultValues: {
            name: user.name || '',
            password: '',
            nip: user.nip || '',
            gender: user.gender as 'Laki-laki' | 'Perempuan' | '' | undefined,
            phone: user.phone || '',
            address: user.address || '',
            subject: user.subject || '',
            class: user.class || '',
        },
    });

    const onSubmit = (data: UpdateUserFormValues) => {
        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.append('userId', user.id);
                formData.append('role', user.role);

                Object.entries(data).forEach(([key, value]) => {
                  if (value !== undefined && value !== null) {
                    formData.append(key, String(value));
                  }
                });

                const result = await updateUser(formData);

                if (result.success) {
                    toast({ title: 'Berhasil', description: `Data pengguna '${user.name}' berhasil diperbarui.` });
                    onSuccess();
                    onBack();
                } else {
                    toast({ variant: 'destructive', title: 'Gagal', description: result.error });
                }

            } catch (error: any) {
                console.error("Error updating user:", error);
                let description = 'Terjadi kesalahan saat memperbarui pengguna.';
                toast({ variant: 'destructive', title: 'Gagal', description });
            }
        });
    };

    const isEditingSelf = currentUser?.uid === user.id;
    const canEditPassword = isEditingSelf || (currentUser?.role === 'Admin' && user.role === 'Guru');

    return (
        <div className="flex flex-col h-full bg-background">
            <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <div className="flex-grow">
                    <h1 className="text-xl font-bold text-foreground truncate">Edit Pengguna</h1>
                    <p className="text-sm text-muted-foreground truncate">{user.name}</p>
                </div>
            </header>
            
            {/* Scrollable form content */}
            <div className="flex-1 overflow-y-auto">
                <form id="edit-user-form" onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-6">
                    {/* Personal Info */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-foreground border-b pb-2">Informasi Pribadi</h3>
                        {user.role === 'Guru' && (
                            <div className="space-y-2">
                                <Label htmlFor="nip">NIP</Label>
                                <Input id="nip" {...register('nip')} placeholder="Nomor Induk Pegawai" disabled={isPending} />
                            </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="gender">Jenis Kelamin</Label>
                          <Controller
                              name="gender"
                              control={control}
                              render={({ field }) => (
                                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                                      <SelectTrigger id="gender">
                                          <SelectValue placeholder="Pilih jenis kelamin" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                                          <SelectItem value="Perempuan">Perempuan</SelectItem>
                                      </SelectContent>
                                  </Select>
                              )}
                          />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">No. Telepon</Label>
                            <Input id="phone" {...register('phone')} placeholder="Nomor telepon aktif" disabled={isPending} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Alamat</Label>
                            <Input id="address" {...register('address')} placeholder="Alamat lengkap" disabled={isPending} />
                        </div>
                    </div>

                    {/* Academic Info */}
                    {user.role === 'Guru' && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-foreground border-b pb-2">Informasi Akademik</h3>
                            <div className="space-y-2">
                                <Label htmlFor="subject">Mata Pelajaran</Label>
                                <Input id="subject" {...register('subject')} placeholder="Contoh: Matematika" disabled={isPending} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="class">Mengajar Kelas</Label>
                                <Input id="class" {...register('class')} placeholder="Contoh: 10A, 11B" disabled={isPending} />
                            </div>
                        </div>
                    )}

                    {/* Admin Info */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-foreground border-b pb-2">Informasi Administrasi</h3>
                        <div className="space-y-2">
                            <Label htmlFor="name">Nama Lengkap</Label>
                            <Input id="name" {...register('name')} placeholder="Nama lengkap pengguna" disabled={isPending} />
                            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Kata Sandi Baru</Label>
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? 'text' : 'password'} 
                                    {...register('password')} 
                                    placeholder={canEditPassword ? "Biarkan kosong jika tidak ingin mengubah" : "Tidak dapat mengubah kata sandi"}
                                    disabled={isPending || !canEditPassword} 
                                    className="pr-10"
                                />
                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(!showPassword)} disabled={isPending || !canEditPassword}>
                                    <span className="sr-only">Toggle password visibility</span>
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </Button>
                            </div>
                            {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
                            {!canEditPassword && <p className="text-muted-foreground text-xs mt-1">Admin tidak dapat mengubah kata sandi admin lain.</p>}
                        </div>
                    </div>
                </form>
            </div>
            
            {/* Fixed bottom action buttons */}
            <div className="mt-auto border-t bg-background p-4">
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onBack} disabled={isPending} className="flex-1">Batal</Button>
                    <Button type="submit" form="edit-user-form" disabled={isPending || !isDirty} className="flex-1">
                        {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function UserManagement({ setIsEditing }: { setIsEditing?: (isEditing: boolean) => void }) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [processedUsers, setProcessedUsers] = useState<ProcessedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [attendanceStatusMap, setAttendanceStatusMap] = useState<Map<string, AttendanceStatus>>(new Map());
  const [settings, setSettings] = useState<any>(null);

  const [selectedUser, setSelectedUser] = useState<ProcessedUser | null>(null);
  const [editingUser, setEditingUserInternal] = useState<User | null>(null);

  const { toast } = useToast();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAbsentListOpen, setIsAbsentListOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [backButtonListener, setBackButtonListener] = useState<PluginListenerHandle | null>(null);

  // Propagate editing state to parent
  const setEditingUser = (user: User | null) => {
    setEditingUserInternal(user);
    if (setIsEditing) {
      setIsEditing(!!user);
    }
  };
  
  const fetchAllUsers = useCallback(async () => {
    try {
        const adminQuery = query(collection(db, "admin"));
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
  }, [toast]);

  const removeListener = useCallback(() => {
    if (backButtonListener) {
      backButtonListener.remove();
      setBackButtonListener(null);
    }
  }, [backButtonListener]);

  const handleBackButton = useCallback((e: any) => {
    e.canGoBack = false;
    if (editingUser) setEditingUser(null);
    else if (isAddUserOpen) setIsAddUserOpen(false);
    else if (isDetailOpen) setIsDetailOpen(false);
    else if (isDeleteOpen) setIsDeleteOpen(false);
    else if (isAbsentListOpen) setIsAbsentListOpen(false);
  }, [editingUser, isAddUserOpen, isDetailOpen, isDeleteOpen, isAbsentListOpen]);
  
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

  useEffect(() => {
    setLoading(true);
    
    const settingsRef = doc(db, "settings", "attendance");
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
        setSettings(docSnap.exists() ? docSnap.data() : {});
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
    });
    
    fetchAllUsers();

    return () => {
      unsubSettings();
      unsubAttendance();
    }
  }, [toast, fetchAllUsers, refreshKey]);
  
  useEffect(() => {
    if (!settings || allUsers.length === 0) {
        setLoading(allUsers.length === 0);
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

  const openDetailDialog = (user: ProcessedUser) => {
    setSelectedUser(user);
    setIsDetailOpen(true);
  };
  
  const openEditDialog = (user: ProcessedUser) => {
    setEditingUser(user);
  };
  
  const openDeleteDialog = (user: ProcessedUser) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  }

  const handleUserActionSuccess = () => {
    setRefreshKey(oldKey => oldKey + 1);
  };

  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage * USERS_PER_PAGE < totalFilteredCount;

  if (editingUser) {
      return <EditUserForm user={editingUser} onBack={() => setEditingUser(null)} onSuccess={handleUserActionSuccess} />;
  }

  return (
    <>
      <div className="bg-gray-50 dark:bg-zinc-900 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h1 className="text-xl font-bold text-foreground">Manajemen Pengguna</h1>
        </header>

        <div className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
              <div className="relative flex-grow w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    placeholder="Cari pengguna..." 
                    className="pl-10 w-full" 
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
              </div>
              <div className='flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0'>
                  <Button variant="outline" className="w-1/2 sm:w-auto" onClick={() => setIsAbsentListOpen(true)}>
                      <UserX className="mr-2 h-4 w-4" />
                      Belum Absen
                  </Button>
                  <Button className="w-1/2 sm:w-auto" onClick={() => setIsAddUserOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Tambah
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
                               <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                                            <MoreVertical className="h-4 w-4" />
                                            <span className="sr-only">Opsi</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => openDetailDialog(user)}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            <span>Lihat Detail</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => openEditDialog(user)}>
                                            <EditIcon className="mr-2 h-4 w-4" />
                                            <span>Edit</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => openDeleteDialog(user)} className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Hapus</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
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
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
            <DialogTitle>Detail Pengguna</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] -mx-6 px-6">
              {selectedUser && (
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
              )}
            </ScrollArea>
        </DialogContent>
      </Dialog>
      <Dialog open={isAbsentListOpen} onOpenChange={setIsAbsentListOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Guru yang Belum Absen</DialogTitle>
                <DialogDescription>
                    Berikut adalah daftar guru yang belum melakukan absensi hari ini.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] -mx-6">
                <div className="px-6 py-4 space-y-3">
                    {/* Placeholder for absent users list */}
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
      <AddUserDialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen} onSuccess={handleUserActionSuccess} />
    </>
  );
}
