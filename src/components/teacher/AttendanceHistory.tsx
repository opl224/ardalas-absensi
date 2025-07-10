
'use client'

import { useState, useEffect, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs, Timestamp, orderBy, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '../ui/loader';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { CalendarIcon, Download, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';


interface HistoryRecord {
    id: string;
    checkInTime: Timestamp;
    checkOutTime?: Timestamp;
    status: 'Hadir' | 'Terlambat' | 'Kecurangan' | 'Tidak Hadir';
}

const filterOptions = ['Semua Kehadiran', 'Hadir', 'Terlambat', 'Tidak Hadir'];

export function AttendanceHistory() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [statusFilter, setStatusFilter] = useState('Semua Kehadiran');

  useEffect(() => {
    if (!userProfile?.uid) {
        setLoading(false);
        return;
    };

    const fetchAttendance = async () => {
        if (!date) return;
        setLoading(true);
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const q = query(
                collection(db, "photo_attendances"),
                where("userId", "==", userProfile.uid),
                where("checkInTime", ">=", startOfDay),
                where("checkInTime", "<=", endOfDay),
                orderBy("checkInTime", "desc")
            );

            const querySnapshot = await getDocs(q);
            const historyData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as HistoryRecord[];

            setHistory(historyData);
        } catch (error) {
            console.error("Error fetching attendance history: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Gagal memuat riwayat kehadiran.' });
        } finally {
            setLoading(false);
        }
    };

    fetchAttendance();
  }, [userProfile, date, toast]);

  const filteredHistory = useMemo(() => {
    if (statusFilter === 'Semua Kehadiran') {
      return history;
    }
    return history.filter(record => record.status === statusFilter);
  }, [history, statusFilter]);

  const handleDownload = async (formatType: 'pdf' | 'csv') => {
    if (loading || filteredHistory.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Gagal Mengunduh',
        description: 'Tidak ada data untuk diunduh.',
      });
      return;
    }

    const headers = ['Nama', 'Tanggal', 'Waktu Absen Masuk', 'Waktu Absen Keluar', 'Status'];
    const data = filteredHistory.map(d => [
        userProfile?.name || '-',
        d.checkInTime.toDate().toLocaleDateString('id-ID'),
        d.checkInTime.toDate().toLocaleTimeString('id-ID'),
        d.checkOutTime ? d.checkOutTime.toDate().toLocaleTimeString('id-ID') : '-',
        d.status
    ]);
    const formattedDate = date ? format(date, "yyyy-MM-dd") : 'tanggal-tidak-dipilih';
    const filename = `Laporan_Kehadiran_${userProfile?.name?.replace(' ', '_')}_${formattedDate}.${formatType}`;

    if (Capacitor.isNativePlatform()) {
        try {
            let fileData: string;
            if (formatType === 'csv') {
                const csvContent = [headers.join(','), ...data.map(row => row.join(','))].join('\n');
                fileData = btoa(unescape(encodeURIComponent(csvContent)));
            } else { // pdf
                const { default: jsPDF } = await import('jspdf');
                const { default: autoTable } = await import('jspdf-autotable');
                const doc = new jsPDF();
                doc.text(`Laporan Kehadiran - ${userProfile?.name}`, 14, 10);
                doc.text(`Tanggal: ${date ? format(date, "PPP", { locale: localeId }) : 'Semua'}`, 14, 16);
                autoTable(doc, { head: [headers], body: data, startY: 22 });
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
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
    
        if (formatType === 'pdf') {
          const { default: jsPDF } = await import('jspdf');
          const { default: autoTable } = await import('jspdf-autotable');
          const doc = new jsPDF();
          doc.text(`Laporan Kehadiran - ${userProfile?.name}`, 14, 10);
          doc.text(`Tanggal: ${date ? format(date, "PPP", { locale: localeId }) : 'Semua'}`, 14, 16);
          autoTable(doc, { head: [headers], body: data, startY: 22 });
          doc.save(filename);
        }
    }
  };


  if (!userProfile) {
    return <div className="p-4 text-center">Memuat data pengguna...</div>
  }

  return (
    <div className="bg-gray-50 dark:bg-zinc-900">
        <header className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <h1 className="text-xl font-bold text-foreground">Riwayat Kehadiran</h1>
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
                <div className="w-1/3 shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                                <Filter className="mr-2 h-4 w-4" />
                                <span className="truncate">{statusFilter}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {filterOptions.map(option => (
                                <DropdownMenuItem key={option} onSelect={() => setStatusFilter(option)}>
                                    {option}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <Download className="mr-2 h-4 w-4" />
                            Unduh Laporan
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[--radix-dropdown-menu-trigger-width]]">
                        <DropdownMenuItem onSelect={() => handleDownload('pdf')}>Unduh sebagai PDF</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDownload('csv')}>Unduh sebagai CSV</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader scale={1.6} />
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredHistory.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">Tidak ada riwayat untuk filter yang dipilih.</p>
                    ) : (
                        filteredHistory.map((item) => (
                            <Card key={item.id} className="p-3 flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={userProfile.avatar} alt={userProfile.name} data-ai-hint="person portrait" />
                                    <AvatarFallback>{userProfile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-grow">
                                    <p className="font-semibold text-foreground">{format(item.checkInTime.toDate(), "eeee, d MMMM", { locale: localeId })}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Absen Masuk: {item.checkInTime.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                        {item.checkOutTime && (
                                            <>
                                                <br />
                                                {`Absen Keluar: ${item.checkOutTime.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                                            </>
                                        )}
                                    </p>
                                </div>
                                <Badge variant={
                                    item.status === 'Hadir' ? 'success' :
                                    item.status === 'Terlambat' ? 'warning' :
                                    item.status === 'Tidak Hadir' ? 'outline' : 'destructive'
                                } className="w-24 justify-center">{item.status}</Badge>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    </div>
  );
}

    
