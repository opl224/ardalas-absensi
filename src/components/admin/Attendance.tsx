

'use client'

import React, { useState, useEffect, useMemo, useRef, useTransition, useCallback } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { collection, query, orderBy, Timestamp, doc, where, onSnapshot, getDocs, limit, startAfter, QueryDocumentSnapshot, updateDoc, deleteField, deleteDoc, getDoc } from 'firebase/firestore';
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

const RECORDS_PER_PAGE = 10;
const filterOptions = ['Semua Kehadiran', 'Hadir', 'Terlambat', 'Tidak Hadir', 'Kecurangan'];

function EditAttendanceDialog({ record, open, onOpenChange, onSuccess }: { record: AttendanceRecord | null, open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [removeFraud, setRemoveFraud] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

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
        startTransition(async () => {
            if (!formRef.current) return;
            const formData = new FormData(formRef.current);
            
            const attendanceId = formData.get("attendanceId") as string;
            const checkInTime = formData.get("checkInTime") as string;
            const checkOutTime = formData.get("checkOutTime") as string;
            const status = formData.get("status") as 'Hadir' | 'Terlambat' | 'Tidak Hadir';
            const removeFraudWarning = removeFraud;

            try {
                const recordRef = doc(db, "photo_attendances", attendanceId);
                const recordSnap = await getDoc(recordRef);

                if (!recordSnap.exists()) {
                    throw new Error("Catatan kehadiran tidak ditemukan.");
                }
                const originalData = recordSnap.data();
                const originalCheckInTime = originalData.checkInTime as Timestamp;

                const newCheckInDate = new Date(checkInTime);
                
                const updateData: any = { status };

                if (originalCheckInTime.toMillis() !== newCheckInDate.getTime()) {
                    updateData.checkInTime = Timestamp.fromDate(newCheckInDate);
                }

                if (checkOutTime && checkOutTime.length > 0) {
                    updateData.checkOutTime = Timestamp.fromDate(new Date(checkOutTime));
                } else {
                    updateData.checkOutTime = deleteField();
                }

                if (removeFraudWarning) {
                    updateData.isFraudulent = false;
                    updateData.fraudReason = '';
                }

                await updateDoc(recordRef, updateData);
                toast({ title: 'Berhasil', description: 'Catatan kehadiran telah diperbarui.' });
                onSuccess();
                onOpenChange(false);

            } catch (e: any) {
                console.error('Error updating attendance record:', e);
                const errorMessage = e instanceof Error ? e.message : "Terjadi kesalahan yang tidak terduga.";
                toast({ variant: 'destructive', title: 'Gagal', description: `Kesalahan: ${errorMessage}.` });
            }
        });
    }
    
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setRemoveFraud(false); 
        }
        onOpenChange(isOpen);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
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
                                checked={removeFraud}
                                onCheckedChange={setRemoveFraud}
                                disabled={isPending}
                            />
                            <Label htmlFor="removeFraudWarning">Hapus Peringatan Kecurangan</Label>
                        </div>
                    )}
                    <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-y-2 sm:gap-x-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Batal</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

const AttendanceCard = React.memo(({ item, openViewDialog, openEditDialog, openDeleteDialog, getBadgeVariant }: { item: AttendanceRecord, openViewDialog: (item: AttendanceRecord) => void, openEditDialog: (item: AttendanceRecord) => void, openDeleteDialog: (id: string) => void, getBadgeVariant: (item: AttendanceRecord) => any }) => {
    return (
        <Card className="p-3 flex items-center gap-4">
            <div className="flex-grow min-w-0 flex items-center gap-4 cursor-pointer" onClick={() => openViewDialog(item)}>
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
            <div className="flex items-center gap-2">
                <div className="flex flex-col items-center justify-center gap-1">
                    {item.isFraudulent && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                    <Badge variant={getBadgeVariant(item)} className="w-24 justify-center shrink-0">
                        {item.status}
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
        </Card>
    );
});

AttendanceCard.displayName = 'AttendanceCard';


export default function Attendance() {
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, startDeleteTransition] = useTransition();
    const [currentPage, setCurrentPage] = useState(1);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
    const [pageFirstDocs, setPageFirstDocs] = useState<(QueryDocumentSnapshot | null)[]>([null]);
    
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [statusFilter, setStatusFilter] = useState('Semua Kehadiran');
    const { toast } = useToast();

    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    
    const [backButtonListener, setBackButtonListener] = useState<PluginListenerHandle | null>(null);

    const fetchAttendanceData = useCallback(async (direction: 'next' | 'prev' | 'first' = 'first') => {
        if (!date) return;
        setLoading(true);

        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            let q = query(
                collection(db, "photo_attendances"),
                where("role", "==", "guru"),
                where("checkInTime", ">=", startOfDay),
                where("checkInTime", "<=", endOfDay)
            );

            if (statusFilter !== 'Semua Kehadiran') {
                if (statusFilter === 'Kecurangan') {
                    q = query(q, where("isFraudulent", "==", true));
                } else {
                    q = query(q, where("status", "==", statusFilter));
                }
            }
            
            q = query(q, orderBy("checkInTime", "desc"));

            if (direction === 'next' && lastVisible) {
                q = query(q, startAfter(lastVisible));
            } else if (direction === 'prev') {
                const prevPageCursor = pageFirstDocs[currentPage - 1];
                q = query(q, startAfter(prevPageCursor));
            }
            
            q = query(q, limit(RECORDS_PER_PAGE));
            
            const documentSnapshots = await getDocs(q);
            const records: AttendanceRecord[] = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AttendanceRecord[];

            setAttendanceData(records);
            
            const newLastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1] || null;
            const newFirstVisible = documentSnapshots.docs[0] || null;
            
            setLastVisible(newLastVisible);

            if (direction === 'first') {
                setCurrentPage(1);
                setPageFirstDocs([null, newFirstVisible]);
            } else if (direction === 'next') {
                setCurrentPage(prev => prev + 1);
                setPageFirstDocs(prev => [...prev, newFirstVisible]);
            } else if (direction === 'prev') {
                setCurrentPage(prev => prev - 1);
            }

        } catch (error) {
            console.error("Error fetching attendance data: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Gagal memuat data kehadiran.' });
        } finally {
            setLoading(false);
        }
    }, [date, statusFilter, lastVisible, currentPage, pageFirstDocs, toast]);

    const handleFilterOrDateChange = useCallback(() => {
        setLastVisible(null);
        setCurrentPage(1);
        setPageFirstDocs([null]);
        // The fetchAttendanceData in useEffect will handle fetching.
    }, []);

    useEffect(() => {
        fetchAttendanceData('first');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, statusFilter]);
    
    const handleEditSuccess = useCallback(() => {
        fetchAttendanceData('first');
    }, [fetchAttendanceData]);


    const removeListener = useCallback(() => {
        if (backButtonListener) {
            backButtonListener.remove();
            setBackButtonListener(null);
        }
    }, [backButtonListener]);

    const handleBackButton = useCallback((e: any) => {
        e.canGoBack = false;
        if (selectedRecord) setSelectedRecord(null);
        else if (recordToDelete) setRecordToDelete(null);
        else if (editingRecord) setEditingRecord(null);
    }, [selectedRecord, recordToDelete, editingRecord]);
    
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

    const handleNextPage = () => {
        if (!lastVisible) return;
        fetchAttendanceData('next');
    };

    const handlePrevPage = () => {
        if (currentPage <= 1) return;
        fetchAttendanceData('prev');
    };


    const handleDownload = async (formatType: 'pdf' | 'csv') => {
        toast({ title: "Mempersiapkan Unduhan...", description: "Ini mungkin memakan waktu beberapa saat." });
        
        try {
            const startOfDay = new Date(date!);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date!);
            endOfDay.setHours(23, 59, 59, 999);

            let allDataQuery = query(
                collection(db, "photo_attendances"),
                where("role", "==", "guru"),
                where("checkInTime", ">=", startOfDay),
                where("checkInTime", "<=", endOfDay),
                orderBy("checkInTime", "desc")
            );

            if (statusFilter !== 'Semua Kehadiran') {
                if (statusFilter === 'Kecurangan') {
                    allDataQuery = query(allDataQuery, where("isFraudulent", "==", true));
                } else {
                    allDataQuery = query(allDataQuery, where("status", "==", statusFilter));
                }
            }

            const allDocsSnapshot = await getDocs(allDataQuery);
            const allRecords = allDocsSnapshot.docs.map(doc => doc.data());
            
            if (allRecords.length === 0) {
                toast({ variant: 'destructive', title: 'Gagal Mengunduh', description: 'Tidak ada data untuk diunduh.' });
                return;
            }

            const headers = ['Nama', 'Peran', 'Waktu Absen Masuk', 'Waktu Absen Keluar', 'Status'];
            const data = allRecords.map(d => [
                d.name,
                d.role,
                d.status !== 'Tidak Hadir' ? d.checkInTime.toDate().toLocaleString('id-ID') : '-',
                d.checkOutTime ? d.checkOutTime.toDate().toLocaleString('id-ID') : '-',
                d.isFraudulent ? `Kecurangan (${d.status})` : d.status
            ]);
            const formattedDate = date ? format(date, "yyyy-MM-dd") : 'tanggal_tidak_dipilih';
            const filename = `Laporan_Kehadiran_Guru_${formattedDate}.${formatType}`;
        
            if (Capacitor.isNativePlatform()) {
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
    
            } else {
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
                    doc.text(`Laporan Kehadiran Guru - ${date ? format(date, "PPP", { locale: localeId }) : 'Semua'}`, 14, 16);
                    autoTable(doc, { head: [headers], body: data, startY: 20 });
                    doc.save(filename);
                }
            }
        } catch (e: any) {
            console.error('Error during download:', e);
            toast({
                variant: 'destructive',
                title: 'Gagal Mengunduh',
                description: e.message || 'Terjadi kesalahan saat mempersiapkan file.',
            });
        }
    };

    const handleDelete = () => {
        if (!recordToDelete) return;
        startDeleteTransition(async () => {
            try {
                const recordRef = doc(db, "photo_attendances", recordToDelete);
                await deleteDoc(recordRef);
                toast({
                    title: "Berhasil",
                    description: "Catatan kehadiran telah dihapus.",
                });
                setAttendanceData(prevData => prevData.filter(record => record.id !== recordToDelete));
            } catch (e: any) {
                 toast({
                    title: "Gagal",
                    description: e.message || "Gagal menghapus catatan kehadiran.",
                    variant: "destructive",
                });
            } finally {
                setRecordToDelete(null);
            }
        });
    };
    
    const getBadgeVariant = (record: AttendanceRecord) => {
        switch (record.status) {
            case 'Hadir': return 'success';
            case 'Terlambat': return 'warning';
            case 'Tidak Hadir': return 'destructive';
            default: return 'outline';
        }
    }

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
                                    onSelect={(newDate) => {
                                        setDate(newDate);
                                        handleFilterOrDateChange();
                                    }}
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
                                <DropdownMenuItem key={option} onSelect={() => {
                                    setStatusFilter(option);
                                    handleFilterOrDateChange();
                                }}>
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
                        {attendanceData.length > 0 ? (
                            attendanceData.map((item) => (
                                <AttendanceCard 
                                    key={item.id} 
                                    item={item} 
                                    openViewDialog={setSelectedRecord}
                                    openEditDialog={setEditingRecord}
                                    openDeleteDialog={setRecordToDelete}
                                    getBadgeVariant={getBadgeVariant}
                                />
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">Tidak ada catatan kehadiran untuk filter yang dipilih.</p>
                        )}
                    </div>
                    {(currentPage > 1 || (lastVisible && attendanceData.length >= RECORDS_PER_PAGE)) && (
                         <div className="flex items-center justify-center space-x-2 mt-6">
                            <Button
                                variant="outline"
                                onClick={handlePrevPage}
                                disabled={currentPage === 1 || loading}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Sebelumnya
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleNextPage}
                                disabled={!lastVisible || loading}
                            >
                                Berikutnya
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    </>
                )}
            </div>

            {recordToDelete && (
                <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Apakah Anda yakin ingin menghapus?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tindakan ini tidak dapat dibatalkan. Catatan kehadiran akan dihapus secara permanen dari basis data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                                className={cn(buttonVariants({ variant: "destructive" }))}
                                disabled={isDeleting}
                                onClick={handleDelete}
                            >
                                {isDeleting ? "Menghapus..." : "Hapus"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {selectedRecord && (
                <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{selectedRecord?.name}</DialogTitle>
                            <DialogDescription>Detail catatan kehadiran.</DialogDescription>
                        </DialogHeader>
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
                                    <Badge variant={getBadgeVariant(selectedRecord)}>{selectedRecord.status}</Badge>
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
                    </DialogContent>
                </Dialog>
            )}

            {editingRecord && (
                <EditAttendanceDialog record={editingRecord} open={!!editingRecord} onOpenChange={() => setEditingRecord(null)} onSuccess={handleEditSuccess} />
            )}
        </div>
    )
}
