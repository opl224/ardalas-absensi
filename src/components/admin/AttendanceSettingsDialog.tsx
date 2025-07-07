'use client';

import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { updateAttendanceSettings, type SettingsState } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LottieLoader } from '../ui/lottie-loader';
import { Separator } from '../ui/separator';

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const daysOfWeekIndonesian: { [key: string]: string } = {
    'Sunday': 'Minggu',
    'Monday': 'Senin',
    'Tuesday': 'Selasa',
    'Wednesday': 'Rabu',
    'Thursday': 'Kamis',
    'Friday': 'Jumat',
    'Saturday': 'Sabtu'
};

interface Settings {
    checkInStart: string;
    checkInEnd: string;
    checkOutStart: string;
    checkOutEnd: string;
    offDays: string[];
}

interface AttendanceSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AttendanceSettingsDialog({ open, onOpenChange }: AttendanceSettingsDialogProps) {
    const { toast } = useToast();
    const initialState: SettingsState = {};
    const [state, formAction] = useFormState(updateAttendanceSettings, initialState);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        if (state.success) {
            toast({ title: 'Berhasil', description: 'Pengaturan berhasil diperbarui.' });
            onOpenChange(false);
        }
        if (state.error) {
            toast({ variant: 'destructive', title: 'Error', description: state.error });
        }
    }, [state, toast, onOpenChange]);

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
                        <LottieLoader />
                    </div>
                ) : (
                    <form action={formAction}>
                        <div className="space-y-4 py-4">
                            <h3 className="font-semibold text-foreground">Jam Masuk</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="checkInStart">Mulai</Label>
                                    <Input id="checkInStart" name="checkInStart" type="time" defaultValue={settings.checkInStart} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="checkInEnd">Selesai</Label>
                                    <Input id="checkInEnd" name="checkInEnd" type="time" defaultValue={settings.checkInEnd} />
                                </div>
                            </div>
                            <Separator />
                            <h3 className="font-semibold text-foreground">Jam Pulang</h3>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="checkOutStart">Mulai</Label>
                                    <Input id="checkOutStart" name="checkOutStart" type="time" defaultValue={settings.checkOutStart} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="checkOutEnd">Selesai</Label>
                                    <Input id="checkOutEnd" name="checkOutEnd" type="time" defaultValue={settings.checkOutEnd} />
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
                                        />
                                        <Label htmlFor={`day-${day}`}>{daysOfWeekIndonesian[day]}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
                            <Button type="submit">Simpan</Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
