
'use client'

import { useState, useEffect, useMemo, useRef, useTransition, useCallback } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { collection, query, orderBy, Timestamp, getDocs, doc, deleteDoc, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '../ui/loader';
import { Button, buttonVariants } from '../ui/button';
import { ChevronLeft, ChevronRight, Trash2, Calendar as CalendarIcon, Download, Filter, AlertTriangle, MapPin, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Calendar } from "@/components/ui/calendar";
import { updateAttendanceRecord, type AttendanceUpdateState } from '@/app/actions';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';


interface AttendanceRecord {
    id: string;
    userId: string;
    name: string;
    role: string;
    checkInTime: Timestamp;
    checkOutTime?: Timestamp;
    status: 'Hadir' | 'Terlambat' | 'Tidak Hadir';
    checkInPhotoUrl?: string;
    isFraudulent?: boolean;
    fraudReason?: string;
    checkInLocation?: { latitude: number, longitude: number };
}

interface FirestoreUser {
    id: string;
    name: string;
    role: string;
    avatar?: string;
}

const RECORDS_PER_PAGE = 10;
const filterOptions = ['Semua Kehadiran', 'Hadir', 'Terlambat', 'Tidak Hadir', 'Kecurangan'];

function EditAttendanceDialog({ record, open, onOpenChange }: { record: AttendanceRecord | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    const [state, setState] = useState<AttendanceUpdateState>({});
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [listener, setListener] = useState<PluginListenerHandle | null>(null);

    const removeListener = useCallback(() => {
        if (listener) {
            listener.remove();
            setListener(null);
        }
    }, [listener]);

    useEffect(() => {
        const setupBackButtonListener = async () => {
            if (Capacitor.isNativePlatform() && open) {
                const l = await CapacitorApp.addListener('backButton', (e) => {
                    e.canGoBack = false;
                    onOpenChange(false);
                });
                setListener(l);
            }
        };

        if (open) {
            setupBackButtonListener();
        } else {
            removeListener();
        }

        return () => {
            removeListener();
        };
    }, [open, onOpenChange, removeListener]);


    useEffect(() => {
        if (state.success) {
            toast({ title: 'Berhasil', description: 'Catatan kehadiran telah diperbarui.' });
            onOpenChange(false);
        }
        if (state.error) {
            toast({ variant: 'destructive', title: 'Gagal', description: state.error });
        }
    }, [state, toast, onOpenChange]);

    if (!record) return null;

    const toDateTimeLocal = (timestamp?: Timestamp): string => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
        return localISOTime;
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!formRef.current) return;
        const formData = new FormData(formRef.current);
        startTransition(async () => {
            const result = await updateAttendanceRecord(formData);
            setState(result);
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Kehadiran: {record.name}</DialogTitle>
                </DialogHeader>
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <input type="hidden" name="attendanceId" value={record.id} />
                    <div className="space-y-2">
                        <Label htmlFor="checkInTime">Waktu Absen Masuk</Label>
                        <Input
                            id="checkInTime"
                            name="checkInTime"
                            type="datetime-local"
                            defaultValue={toDateTimeLocal(record.checkInTime)}
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="checkOutTime">Waktu Absen Keluar</Label>
                        <Input
                            id="checkOutTime"
                            name="checkOutTime"
                            type="datetime-local"
                            defaultValue={toDateTimeLocal(record.checkOutTime)}
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select name="status" defaultValue={record.status} disabled={isPending}>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Pilih status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Hadir">Hadir</SelectItem>
                                <SelectItem value="Terlambat">Terlambat</SelectItem>
                                <SelectItem value="Tidak Hadir">Tidak Hadir</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {record.isFraudulent && (
                        <div className="flex items-center space-x-2 pt-2">
                            <Switch
                                id="removeFraudWarning"
                                name="removeFraudWarning"
                                disabled={isPending}
                            />
                            <Label htmlFor="removeFraudWarning">Hapus Peringatan Kecurangan</Label>
                        </div>
                    )}
                    <DialogFooter className="pt-2 sm:gap-x-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="mt-2 sm:mt-0">Batal</Button>
                        <Button type="submit" disabled={isPending}>
                            Simpan Perubahan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function Attendance() {
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [statusFilter, setStatusFilter] = useState('Semua Kehadiran');
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
    const { toast } = useToast();
    const [settings, setSettings] = useState<any>(null);

    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    const [listener, setListener] = useState<PluginListenerHandle | null>(null);

    const removeListener = useCallback(() => {
        if (listener) {
            listener.remove();
            setListener(null);
        }
    }, [listener]);
    
    useEffect(() => {
        const setupBackButtonListener = async () => {
            if (Capacitor.isNativePlatform()) {
                const l = await CapacitorApp.addListener('backButton', (e) => {
                    e.canGoBack = false;
                    if (isViewOpen) setIsViewOpen(false);
                    else if (isDeleteOpen) setIsDeleteOpen(false);
                    else if (isEditOpen) setIsEditOpen(false);
                });
                setListener(l);
            }
        };

        setupBackButtonListener();
        
        return () => {
            removeListener();
        };
    }, [isViewOpen, isDeleteOpen, isEditOpen, removeListener]);

    useEffect(() => {
        const settingsRef = doc(db, "settings", "attendance");
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            setSettings(docSnap.exists() ? docSnap.data() : { checkInEnd: '09:00', offDays: [], gracePeriod: 60 });
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!date || !settings) return;
        setLoading(true);

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const q = query(
            collection(db, "photo_attendances"),
            where("role", "==", "guru"),
            where("checkInTime", ">=", startOfDay),
            where("checkInTime", "<=", endOfDay),
            orderBy("checkInTime", "desc")
        );
        
        const unsubscribeAttendance = onSnapshot(q, async (querySnapshot) => {
            const fetchedRecords: AttendanceRecord[] = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as AttendanceRecord[];
            
            let finalRecords = [...fetchedRecords];

            const now = new Date();
            const selectedDateStr = date.toLocaleDateString('en-US', { weekday: 'long' });
            const isOffDay = settings.offDays.includes(selectedDateStr);

            const checkInEndStr = settings.checkInEnd || '09:00';
            const [endHours, endMinutes] = checkInEndStr.split(':').map(Number);
            const checkInDeadline = new Date(date);
            checkInDeadline.setHours(endHours, endMinutes, 0, 0);
            const gracePeriodMinutes = settings.gracePeriod ?? 60;
            const checkInGraceEnd = new Date(checkInDeadline.getTime() + gracePeriodMinutes * 60 * 1000);
            
            const isToday = now.toDateString() === date.toDateString();
            const canDetermineAbsent = !isOffDay && (date < new Date(new Date().setHours(0, 0, 0, 0)) || (isToday && now > checkInGraceEnd));

            if (canDetermineAbsent) {
                const usersQuery = query(collection(db, 'users'), where('role', '==', 'guru'));
                const usersSnapshot = await getDocs(usersQuery);
                const allUsers = usersSnapshot.docs.map(userDoc => ({ id: userDoc.id, ...userDoc.data() })) as FirestoreUser[];

                const presentUserIds = new Set(fetchedRecords.map(r => r.userId));
                const absentUsers = allUsers.filter(user => !presentUserIds.has(user.id));
                
                const absentRecords: AttendanceRecord[] = absentUsers.map(user => ({
                    id: `absent-${user.id}-${date.getTime()}`,
                    userId: user.id,
                    name: user.name,
                    role: user.role,
                    checkInTime: Timestamp.fromDate(startOfDay), 
                    status: 'Tidak Hadir',
                    checkInPhotoUrl: user.avatar || '',
                    isFraudulent: false,
                }));
                
                finalRecords = [...fetchedRecords, ...absentRecords];
                finalRecords.sort((a, b) => b.checkInTime.toMillis() - a.checkInTime.toMillis());
            }

            setAttendanceData(finalRecords);
            setCurrentPage(1); 
            setStatusFilter('Semua Kehadiran'); 
            setLoading(false);
        }, (error) => {
            console.error("Error fetching attendance data: ", error);
            toast({
                variant: 'destructive',
                title: 'Gagal Memuat Data',
                description: 'Terjadi kesalahan saat mengambil data kehadiran.'
            });
            setLoading(false);
        });

        return () => {
            unsubscribeAttendance();
        };
    }, [date, settings, toast]);

    const handleFilterChange = (filter: string) => {
        setStatusFilter(filter);
        setCurrentPage(1);
    };

    const handleDownload = async (formatType: 'pdf' | 'csv') => {
        if (loading || attendanceData.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Gagal Mengunduh',
                description: 'Tidak ada data untuk diunduh pada tanggal yang dipilih.',
            });
            return;
        }
    
        const headers = ['Nama', 'Peran', 'Waktu Absen Masuk', 'Waktu Absen Keluar', 'Status'];
        const data = attendanceData.map(d => [
            d.name,
            d.role,
            d.status !== 'Tidak Hadir' ? d.checkInTime.toDate().toLocaleString('id-ID') : '-',
            d.checkOutTime ? d.checkOutTime.toDate().toLocaleString('id-ID') : '-',
            d.isFraudulent ? `Kecurangan (${d.status})` : d.status
        ]);
        const formattedDate = date ? format(date, "yyyy-MM-dd") : 'tanggal_tidak_dipilih';
        const filename = `Laporan_Kehadiran_${formattedDate}.${formatType}`;
    
        if (Capacitor.isNativePlatform()) {
            try {
                let fileData: string;
    
                if (formatType === 'csv') {
                    const csvContent = [headers.join(','), ...data.map(row => row.join(','))].join('\n');
                    fileData = btoa(unescape(encodeURIComponent(csvContent)));
                } else { 
                    const { default: jsPDF } = await import('jspdf');
                    const { default: autoTable } = await import('jspdf-autotable');
                    const doc = new jsPDF();
                    doc.text(`Laporan Kehadiran - ${date ? format(date, "PPP", { locale: localeId }) : 'Semua'}`, 14, 16);
                    autoTable(doc, { head: [headers], body: data, startY: 20 });
                    const dataUri = doc.output('datauristring');
                    fileData = dataUri.substring(dataUri.indexOf(',') + 1);
                }
                
                await Filesystem.writeFile({
                    path: filename,
                    data: fileData,
                    directory: Directory.Documents,
                    recursive: true,
                });
    
                toast({
                    title: "Unduhan Selesai",
                    description: `${filename} disimpan di folder Dokumen perangkat Anda.`,
                });
    
            } catch (e: any) {
                console.error('Error saving file to device', e);
                toast({
                    variant: 'destructive',
                    title: 'Gagal Menyimpan File',
                    description: e.message || 'Tidak dapat menyimpan laporan ke perangkat.',
                });
            }
        } else {
            toast({
                title: "Mempersiapkan Unduhan",
                description: `Laporan Anda akan segera diunduh sebagai ${formatType.toUpperCase()}.`
            });
            
            if (formatType === 'csv') {
                const csvContent = [headers.join(','), ...data.map(row => row.join(','))].join('\n');
                const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        
            if (formatType === 'pdf') {
                const { default: jsPDF } = await import('jspdf');
                const { default: autoTable } = await import('jspdf-autotable');
                const doc = new jsPDF();
                doc.text(`Laporan Kehadiran - ${date ? format(date, "PPP", { locale: localeId }) : 'Semua'}`, 14, 16);
                autoTable(doc, { head: [headers], body: data, startY: 20 });
                doc.save(filename);
            }
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteDoc(doc(db, "photo_attendances", id));
            setAttendanceData(prevData => prevData.filter(record => record.id !== id));
            toast({
                title: "Berhasil",
                description: "Catatan kehadiran telah dihapus.",
            });
        } catch (error) {
            console.error("Error deleting document: ", error);
            toast({
                title: "Gagal",
                description: "Gagal menghapus catatan kehadiran.",
                variant: "destructive",
            });
        } finally {
            setIsDeleteOpen(false);
            setSelectedRecordId(null);
        }
    };
    
    const openViewDialog = (record: AttendanceRecord) => {
        setSelectedRecord(record);
        setIsViewOpen(true);
    };

    const openDeleteDialog = (id: string) => {
        setSelectedRecordId(id);
        setIsDeleteOpen(true);
    }

    const openEditDialog = (record: AttendanceRecord) => {
        if (record.id.startsWith('absent-')) {
            toast({
                variant: 'destructive',
                title: 'Tidak Dapat Mengedit',
                description: 'Catatan "Tidak Hadir" yang dibuat otomatis tidak dapat diedit.',
            });
            return;
        }
        setEditingRecord(record);
        setIsEditOpen(true);
    };
    
    const getBadgeVariant = (record: AttendanceRecord) => {
        switch (record.status) {
            case 'Hadir': return 'success';
            case 'Terlambat': return 'warning';
            case 'Tidak Hadir': return 'destructive';
            default: return 'outline';
        }
    }

    const getBadgeText = (record: AttendanceRecord) => {
        return record.status;
    }

    const filteredData = useMemo(() => {
        if (statusFilter === 'Semua Kehadiran') {
            return attendanceData;
        }
        if (statusFilter === 'Kecurangan') {
            return attendanceData.filter(record => record.isFraudulent);
        }
        return attendanceData.filter(record => record.status === statusFilter);
    }, [attendanceData, statusFilter]);

    const totalPages = Math.ceil(filteredData.length / RECORDS_PER_PAGE);
    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
        return filteredData.slice(startIndex, startIndex + RECORDS_PER_PAGE);
    }, [filteredData, currentPage]);

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


    return (
        <div className="bg-gray-50 dark:bg-zinc-900">
             <header className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <h1 className="text-xl font-bold text-foreground">Catatan Kehadiran Guru</h1>
            </header>
            <div className="p-4 space-y-4">
                 <div className="flex items-center gap-2">
                    <div className="flex-grow">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: localeId }) : <span>Pilih tanggal</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-auto shrink-0">
                                <Filter className="mr-2 h-4 w-4" />
                                <span className="truncate hidden sm:inline">{statusFilter}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {filterOptions.map(option => (
                                <DropdownMenuItem key={option} onSelect={() => handleFilterChange(option)}>
                                    {option}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                 </div>
                 
                 <div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full">
                                <Download className="mr-2 h-4 w-4" />
                                Unduh Laporan
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[--radix-dropdown-menu-trigger-width]">
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
                        {paginatedRecords.length > 0 ? (
                            paginatedRecords.map((item) => (
                                <Card key={item.id} className="p-3">
                                    <div className="flex items-center gap-4">
                                        {/* Clickable area for details */}
                                        <div className="flex-grow min-w-0" onClick={() => openViewDialog(item)}>
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage src={item.checkInPhotoUrl} alt={item.name} data-ai-hint="person portrait" />
                                                    <AvatarFallback>{item.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-grow min-w-0">
                                                    <p className="font-semibold text-foreground truncate">{item.name}</p>
                                                    <p className="text-sm text-muted-foreground capitalize">{item.role}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.status === 'Tidak Hadir'
                                                            ? 'Belum absen masuk'
                                                            : `Absen Masuk: ${item.checkInTime.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status and Action Buttons */}
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                {item.isFraudulent && (
                                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                                )}
                                                <Badge variant={getBadgeVariant(item)} className="w-24 justify-center shrink-0">
                                                    {getBadgeText(item)}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-col gap-1.5 self-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => openEditDialog(item)}
                                                    disabled={item.id.startsWith('absent-')}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                    <span className="sr-only">Edit Catatan</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    onClick={() => openDeleteDialog(item.id)}
                                                    disabled={item.id.startsWith('absent-')}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">Hapus Catatan</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">Tidak ada catatan kehadiran untuk filter yang dipilih.</p>
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
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda yakin ingin menghapus?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Catatan kehadiran akan dihapus secara permanen dari basis data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSelectedRecordId(null)}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            className={cn(buttonVariants({ variant: "destructive" }))}
                            onClick={() => {
                                if (selectedRecordId) handleDelete(selectedRecordId);
                            }}
                        >
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedRecord?.name}</DialogTitle>
                        <DialogDescription>Detail catatan kehadiran.</DialogDescription>
                    </DialogHeader>
                    {selectedRecord && (
                        <div className="space-y-4 pt-2">
                             {selectedRecord.status !== 'Tidak Hadir' && (
                                <div className="flex justify-center">
                                    <Avatar className="h-48 w-48 rounded-lg border-4 border-primary/20 shadow-lg">
                                        <AvatarImage src={selectedRecord.checkInPhotoUrl} alt={selectedRecord.name} className="object-cover" />
                                        <AvatarFallback className="text-5xl rounded-lg">{selectedRecord.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                </div>
                            )}
                            
                            <div className="space-y-2 rounded-lg border bg-muted/50 p-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Peran</span>
                                    <span className="font-medium capitalize">{selectedRecord.role}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Waktu Absen Masuk</span>
                                    <span className="font-medium">
                                        {selectedRecord.status !== 'Tidak Hadir'
                                            ? selectedRecord.checkInTime.toDate().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                                            : 'Belum absen masuk'
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Waktu Absen Keluar</span>
                                    <span className="font-medium">
                                        {selectedRecord.checkOutTime
                                            ? selectedRecord.checkOutTime.toDate().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                                            : 'Belum absen keluar'
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Status</span>
                                    <Badge variant={getBadgeVariant(selectedRecord)}>{getBadgeText(selectedRecord)}</Badge>
                                </div>
                            </div>
                            
                            {selectedRecord.checkInLocation && (
                                <div className="space-y-2 rounded-lg border bg-muted/50 p-4 text-sm">
                                    <div className="flex items-center gap-2 font-medium text-foreground mb-2">
                                        <MapPin className="h-4 w-4" />
                                        <span>Informasi Lokasi</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Latitude</span>
                                        <span className="font-mono text-xs">{selectedRecord.checkInLocation.latitude.toFixed(6)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Longitude</span>
                                        <span className="font-mono text-xs">{selectedRecord.checkInLocation.longitude.toFixed(6)}</span>
                                    </div>
                                    <div className="pt-2">
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${selectedRecord.checkInLocation.latitude},${selectedRecord.checkInLocation.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline text-xs"
                                        >
                                            Buka di Google Maps
                                        </a>
                                    </div>
                                </div>
                            )}

                            {selectedRecord.isFraudulent && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Peringatan Kecurangan</AlertTitle>
                                    <AlertDescription>
                                        {selectedRecord.fraudReason || 'Terdeteksi anomali pada saat absen masuk.'}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            <EditAttendanceDialog record={editingRecord} open={isEditOpen} onOpenChange={setIsEditOpen} />
        </div>
    )
}
