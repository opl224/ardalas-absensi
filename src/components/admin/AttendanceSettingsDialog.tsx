
'use client';

import { useEffect, useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '../ui/loader';
import { Separator } from '../ui/separator';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const daysOfWeekIndonesian: { [key: string]: string } = {
    'Monday': 'Senin',
    'Tuesday': 'Selasa',
    'Wednesday': 'Rabu',
    'Thursday': 'Kamis',
    'Friday': 'Jumat',
    'Saturday': 'Sabtu',
    'Sunday': 'Minggu'
};

interface Settings {
    checkInStart: string;
    checkInEnd: string;
    checkOutStart: string;
    checkOutEnd: string;
    gracePeriod: number;
    offDays: string[];
}

interface AttendanceSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AttendanceSettingsDialog({ open, onOpenChange }: AttendanceSettingsDialogProps) {
    const { toast } = useToast();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const settingsDoc = await getDoc(doc(db, "settings", "attendance"));
                if (settingsDoc.exists()) {
                    setSettings(settingsDoc.data() as Settings);
                } else {
                    // Default settings
                    setSettings({
                        checkInStart: '07:00',
                        checkInEnd: '09:00',
                        checkOutStart: '15:00',
                        checkOutEnd: '17:00',
                        gracePeriod: 60,
                        offDays: ['Sunday', 'Saturday']
                    });
                }
            } catch (error) {
                console.error("Error fetching settings: ", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Gagal memuat pengaturan.' });
            } finally {
                setLoading(false);
            }
        };

        if (open) {
            fetchSettings();
        }
    }, [open, toast]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        
        startTransition(async () => {
            try {
                const updatedSettings = {
                    checkInStart: formData.get('checkInStart') as string,
                    checkInEnd: formData.get('checkInEnd') as string,
                    checkOutStart: formData.get('checkOutStart') as string,
                    checkOutEnd: formData.get('checkOutEnd') as string,
                    gracePeriod: Number(formData.get('gracePeriod')),
                    offDays: formData.getAll('offDays') as string[],
                };

                const settingsRef = doc(db, "settings", "attendance");
                await setDoc(settingsRef, updatedSettings);

                toast({ title: 'Berhasil', description: 'Pengaturan berhasil diperbarui.' });
                onOpenChange(false);
            } catch (error) {
                console.error("Error updating settings: ", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Gagal memperbarui pengaturan.' });
            }
        });
    }

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Pengaturan Jam Kehadiran</DialogTitle>
                    <DialogDescription>
                        Atur jam masuk, jam pulang, dan hari libur untuk absensi.
                    </DialogDescription>
                </DialogHeader>
                {loading || !settings ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <h3 className="font-semibold text-foreground">Jam Absen Masuk</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="checkInStart">Mulai</Label>
                                    <Input id="checkInStart" name="checkInStart" type="time" defaultValue={settings.checkInStart} disabled={isPending} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="checkInEnd">Selesai</Label>
                                    <Input id="checkInEnd" name="checkInEnd" type="time" defaultValue={settings.checkInEnd} disabled={isPending} />
                                </div>
                            </div>
                             <div className="space-y-2 pt-2">
                                <Label htmlFor="gracePeriod">Toleransi Terlambat (menit)</Label>
                                <Input id="gracePeriod" name="gracePeriod" type="number" defaultValue={settings.gracePeriod} placeholder="Contoh: 60" disabled={isPending} />
                            </div>
                            <Separator />
                            <h3 className="font-semibold text-foreground">Jam Absen Keluar</h3>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="checkOutStart">Mulai</Label>
                                    <Input id="checkOutStart" name="checkOutStart" type="time" defaultValue={settings.checkOutStart} disabled={isPending} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="checkOutEnd">Selesai</Label>
                                    <Input id="checkOutEnd" name="checkOutEnd" type="time" defaultValue={settings.checkOutEnd} disabled={isPending} />
                                </div>
                            </div>
                            <Separator />
                            <h3 className="font-semibold text-foreground">Hari Libur</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {daysOfWeek.map(day => (
                                    <div key={day} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`day-${day}`} 
                                            name="offDays" 
                                            value={day} 
                                            defaultChecked={settings.offDays.includes(day)}
                                            disabled={isPending}
                                        />
                                        <Label htmlFor={`day-${day}`}>{daysOfWeekIndonesian[day]}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-y-2 sm:gap-x-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Batal</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? "Menyimpan..." : "Simpan Perubahan"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
