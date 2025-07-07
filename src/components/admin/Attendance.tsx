
'use client'

import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { collection, query, orderBy, Timestamp, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LottieLoader } from '../ui/lottie-loader';
import { Button, buttonVariants } from '../ui/button';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';


interface AttendanceRecord {
    id: string;
    name: string;
    role: string;
    checkInTime: Timestamp;
    checkOutTime?: Timestamp;
    status: 'Hadir' | 'Terlambat' | 'Penipuan' | 'Absen';
    checkInPhotoUrl?: string;
}

const RECORDS_PER_PAGE = 10;

export function Attendance() {
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchAttendance = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, "photo_attendances"), orderBy("checkInTime", "desc"));
                const querySnapshot = await getDocs(q);
                const data: AttendanceRecord[] = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as AttendanceRecord[];
                 setAttendanceData(data);
            } catch (error) {
                console.error("Error fetching attendance data: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, []);

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
            setIsDeleteDialogOpen(false);
            setSelectedRecordId(null);
        }
    };
    
    const openViewDialog = (record: AttendanceRecord) => {
        setSelectedRecord(record);
        setIsViewDialogOpen(true);
    };

    const openDeleteDialog = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // prevent view dialog
        setSelectedRecordId(id);
        setIsDeleteDialogOpen(true);
    }

    const totalPages = Math.ceil(attendanceData.length / RECORDS_PER_PAGE);
    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
        return attendanceData.slice(startIndex, startIndex + RECORDS_PER_PAGE);
    }, [attendanceData, currentPage]);

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
                <h1 className="text-xl font-bold text-foreground">Catatan Kehadiran</h1>
            </header>
            <div className="p-4">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <LottieLoader size={80} />
                    </div>
                ) : (
                    <>
                    <div className="space-y-3">
                        {paginatedRecords.length > 0 ? (
                            paginatedRecords.map((item) => (
                                <Card 
                                    key={item.id} 
                                    className="p-3 flex items-center gap-4 relative cursor-pointer hover:bg-accent/80 transition-colors"
                                    onClick={() => openViewDialog(item)}
                                >
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1 right-1 h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                        onClick={(e) => openDeleteDialog(e, item.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Hapus Catatan</span>
                                    </Button>
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={item.checkInPhotoUrl} alt={item.name} data-ai-hint="person portrait" />
                                        <AvatarFallback>{item.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow min-w-0">
                                        <p className="font-semibold text-foreground truncate pr-8">{item.name}</p>
                                        <p className="text-sm text-muted-foreground">{item.role}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {`Masuk: ${item.checkInTime.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                                            {item.checkOutTime && ` | Keluar: ${item.checkOutTime.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                                        </p>
                                    </div>
                                    <Badge variant={
                                        item.status === 'Hadir' ? 'default' :
                                        item.status === 'Terlambat' ? 'secondary' : 'destructive'
                                    } className="w-24 justify-center shrink-0">{item.status}</Badge>
                                </Card>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">Tidak ada catatan kehadiran.</p>
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
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle className="text-center text-lg">{selectedRecord?.name}</DialogTitle>
                    </DialogHeader>
                    {selectedRecord && (
                        <div className="flex flex-col items-center pt-2">
                            <Avatar className="h-52 w-52 rounded-lg">
                                <AvatarImage src={selectedRecord.checkInPhotoUrl} alt={selectedRecord.name} className="object-cover" />
                                <AvatarFallback className="text-5xl rounded-lg">{selectedRecord.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
