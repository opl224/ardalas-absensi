
'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { BarChart2, CalendarDays, Clock, MapPin, CheckCircle, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { CenteredLoader } from '../ui/loader';
import { collection, query, where, onSnapshot, Timestamp, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import SplitText from '../ui/SplitText';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

interface TeacherHomeProps {
  setActiveView: (view: 'home' | 'history' | 'profile' | 'checkin') => void;
}

type CheckinStatus = 'not_checked_in' | 'checked_in' | 'checked_out' | 'tidak_hadir' | 'loading' | 'off_day';

type CheckoutState = {
    success?: boolean;
    error?: string;
};

function CheckoutButton({ disabled, pending }: { disabled: boolean, pending: boolean }) {
    return (
      <Button type="submit" className="w-full" disabled={pending || disabled}>
        {pending ? 'Memproses...' : 'Absen Keluar'}
      </Button>
    );
}

function QuickCheckoutButton({ disabled, pending }: { disabled: boolean, pending: boolean }) {
    return (
        <button type="submit" disabled={pending || disabled} className="w-full text-left p-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50">
            <Card className="w-full h-full p-4 flex flex-col items-center justify-center text-center hover:bg-secondary">
                {pending ? (
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <LogOut className="h-8 w-8 text-primary" />
                )}
                <p className="mt-2 font-medium text-sm text-foreground">Absen Keluar</p>
            </Card>
        </button>
    )
}

function getTodayAtTime(timeString: string): Date {
    const today = new Date();
    if (!timeString || !timeString.includes(':')) {
        today.setHours(9, 0, 0, 0); // Default to 09:00
        return today;
    }
    const [hours, minutes] = timeString.split(':').map(Number);
    today.setHours(hours, minutes, 0, 0);
    return today;
}

const splitTextFrom = { opacity: 0, y: 20 };
const splitTextTo = { opacity: 1, y: 0 };

export function TeacherHome({ setActiveView }: TeacherHomeProps) {
    const [dateTime, setDateTime] = useState({ date: '', time: '' });
    const [status, setStatus] = useState<CheckinStatus>('loading');
    const [checkinData, setCheckinData] = useState<{ time: string; photo: string; attendanceId: string; status: 'Hadir' | 'Terlambat' | 'Tidak Hadir' } | null>(null);
    const [checkoutTime, setCheckoutTime] = useState<string | null>(null);
    const [isCheckoutAllowed, setIsCheckoutAllowed] = useState(false);
    const [settings, setSettings] = useState<any | null>(null);
    const [todaysAttendance, setTodaysAttendance] = useState<any | 'empty' | 'loading'>('loading');

    const { userProfile } = useAuth();
    const { toast } = useToast();

    const [checkoutState, setCheckoutState] = useState<CheckoutState>({});
    const [isPending, startTransition] = useTransition();

    const isOffDay = useMemo(() => {
        if (!settings) return false;
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-US', { weekday: 'long' });
        return settings.offDays?.includes(todayStr) ?? false;
    }, [settings]);

    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date();
            setDateTime({
                date: now.toLocaleDateString('id-ID', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
                time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            });
        };
        updateDateTime();
        const interval = setInterval(updateDateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const settingsRef = doc(db, "settings", "attendance");
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            setSettings(docSnap.exists() ? docSnap.data() : { checkOutStart: '15:00', checkInEnd: '09:00', gracePeriod: 60, offDays: [] });
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!userProfile?.uid) return;

        setTodaysAttendance('loading');
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        const q = query(
            collection(db, "photo_attendances"),
            where("userId", "==", userProfile.uid),
            where("checkInTime", ">=", startOfToday),
            where("checkInTime", "<", endOfToday),
            orderBy("checkInTime", "desc"),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                setTodaysAttendance('empty');
            } else {
                const docSnap = snapshot.docs[0];
                setTodaysAttendance({ id: docSnap.id, ...docSnap.data() });
            }
        }, (error) => {
            console.error("Error fetching attendance status: ", error);
            toast({
                variant: 'destructive',
                title: 'Gagal memuat status',
                description: 'Tidak dapat mengambil status kehadiran terbaru.',
            });
            setTodaysAttendance('empty');
        });

        return () => unsubscribe();
    }, [userProfile, toast]);

    useEffect(() => {
        if (todaysAttendance === 'loading' || !settings) {
            setStatus('loading');
            return;
        }

        if (isOffDay) {
            setStatus('off_day');
            return;
        }

        const now = new Date();
        setIsCheckoutAllowed(now >= getTodayAtTime(settings.checkOutStart || '15:00'));

        if (todaysAttendance === 'empty') {
            const checkInEnd = getTodayAtTime(settings.checkInEnd || '09:00');
            const gracePeriodMinutes = settings.gracePeriod ?? 60;
            const checkInGraceEnd = new Date(checkInEnd.getTime() + gracePeriodMinutes * 60 * 1000); 

            if (now > checkInGraceEnd) {
                setStatus('tidak_hadir');
            } else {
                setStatus('not_checked_in');
            }
            setCheckinData(null);
            setCheckoutTime(null);
        } else {
            const data = todaysAttendance;
            const checkInTimestamp = data.checkInTime as Timestamp;
            
            setCheckinData({
                time: checkInTimestamp.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                photo: data.checkInPhotoUrl,
                attendanceId: data.id,
                status: data.status,
            });

            if (data.status === 'Tidak Hadir') {
                setStatus('tidak_hadir');
            } else if (data.checkOutTime) {
                const checkOutTimestamp = data.checkOutTime as Timestamp;
                setStatus('checked_out');
                setCheckoutTime(checkOutTimestamp.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit'}));
            } else {
                setStatus('checked_in');
                setCheckoutTime(null);
            }
        }
    }, [settings, todaysAttendance, isOffDay]);


    useEffect(() => {
        if (checkoutState.success) {
            toast({ title: 'Berhasil', description: 'Anda telah berhasil absen keluar.' });
        }
        if (checkoutState.error) {
            toast({ variant: 'destructive', title: 'Kesalahan', description: checkoutState.error });
        }
    }, [checkoutState, toast]);

    const handleCheckoutSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        startTransition(async () => {
            if (!userProfile?.uid || !checkinData?.attendanceId) {
                setCheckoutState({ error: "Informasi pengguna atau absensi tidak ditemukan." });
                return;
            }
            try {
                const attendanceRef = doc(db, "photo_attendances", checkinData.attendanceId);
                await updateDoc(attendanceRef, { checkOutTime: new Date() });
                setCheckoutState({ success: true });
            } catch (e: any) {
                console.error(e);
                setCheckoutState({ error: `Kesalahan server: ${e.message}.` });
            }
        });
    }

    if (!userProfile) {
        return <CenteredLoader />;
    }

    const isCustomAvatar = userProfile.avatar && !userProfile.avatar.includes('placehold.co');

    return (
        <div>
            <header className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <h1 className="text-xl font-bold text-foreground">Beranda</h1>
            </header>

            <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Halo,</p>
                        <SplitText
                            text={userProfile.name}
                            className="text-2xl font-bold text-foreground"
                            delay={120}
                            duration={0.8}
                            ease="power3.out"
                            splitType="chars"
                            from={splitTextFrom}
                            to={splitTextTo}
                            textAlign="left"
                        />
                        <p className="text-sm text-muted-foreground capitalize">{userProfile.role} &bull; {userProfile.subject}</p>
                    </div>
                    {isCustomAvatar ? (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Avatar className="h-14 w-14 cursor-pointer">
                                    <AvatarImage src={userProfile.avatar} alt={userProfile.name} data-ai-hint="person portrait"/>
                                    <AvatarFallback>{userProfile.name.slice(0,2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </DialogTrigger>
                            <DialogContent className="p-0 border-0 bg-transparent shadow-none w-auto max-w-lg">
                                <DialogHeader className="sr-only">
                                    <DialogTitle>Avatar {userProfile.name}</DialogTitle>
                                    <DialogDescription>Gambar avatar ukuran penuh.</DialogDescription>
                                </DialogHeader>
                                <img src={userProfile.avatar} alt={userProfile.name} className="w-full h-auto rounded-lg" data-ai-hint="person portrait" />
                            </DialogContent>
                        </Dialog>
                    ) : (
                        <Avatar className="h-14 w-14">
                            <AvatarImage src={userProfile.avatar} alt={userProfile.name} data-ai-hint="person portrait"/>
                            <AvatarFallback>{userProfile.name.slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    )}
                </div>

                <Card className="p-4">
                    <CardContent className="p-0 space-y-3">
                        <div className="flex items-center gap-4">
                            <CalendarDays className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium text-sm text-foreground">{dateTime.date || 'Memuat tanggal...'}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium text-sm text-foreground">{dateTime.time || 'Memuat waktu...'}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Kehadiran Hari Ini</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        {status === 'loading' && (
                            <div className="flex justify-center items-center h-48">
                                <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                        {status === 'off_day' && (
                             <div className='space-y-4'>
                                <Badge variant="secondary" className="py-1 px-4 text-base">Libur</Badge>
                                <p className="text-muted-foreground">Hari ini adalah hari libur yang dijadwalkan.</p>
                            </div>
                        )}
                        {status === 'not_checked_in' && (
                            <div className='space-y-4'>
                                <p className="text-muted-foreground">Anda belum absen masuk hari ini.</p>
                            </div>
                        )}
                        {status === 'tidak_hadir' && (
                            <div className='space-y-4'>
                                 <Badge variant="destructive" className="py-1 px-4 text-base">Tidak Hadir</Badge>
                                <p className="text-muted-foreground">Waktu absen masuk hari ini telah berakhir atau status diubah oleh admin.</p>
                            </div>
                        )}
                        {(status === 'checked_in' || status === 'checked_out') && checkinData && (
                            <>
                                <Badge variant={checkinData.status === 'Hadir' ? 'success' : 'warning'} className="py-1 px-4 text-base">
                                    {checkinData.status}
                                </Badge>
                                <p className="text-sm text-muted-foreground">Absen masuk pada {checkinData.time}</p>
                                <Avatar className="h-28 w-28 mx-auto">
                                    <AvatarImage src={checkinData.photo} alt="Check-in photo" data-ai-hint="person portrait" />
                                    <AvatarFallback>ME</AvatarFallback>
                                </Avatar>
                                <div className="text-left space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span className='text-muted-foreground'>Lokasi terverifikasi:</span>
                                        <span className='font-medium text-foreground'>Ya</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                        <span className='text-muted-foreground'>Absen keluar pada:</span>
                                        <span className='font-medium text-foreground'>{status === 'checked_out' && checkoutTime ? checkoutTime : ' - '}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setActiveView('checkin')}
                            disabled={status !== 'not_checked_in'}
                            className="rounded-lg p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <Card className="flex h-full w-full flex-col items-center justify-center p-4 text-center hover:bg-secondary">
                                <CheckCircle className={`h-8 w-8 ${status === 'not_checked_in' ? 'text-primary' : 'text-muted-foreground'}`} />
                                <p className="mt-2 text-sm font-medium text-foreground">
                                    {
                                        status === 'not_checked_in' ? 'Absen Masuk' :
                                        status === 'tidak_hadir' || status === 'off_day' ? 'Absen Masuk Dinonaktifkan' :
                                        'Sudah Absen Masuk'
                                    }
                                </p>
                            </Card>
                        </button>
                        {status === 'checked_in' && checkinData ? (
                            <form onSubmit={handleCheckoutSubmit}>
                                <QuickCheckoutButton disabled={!isCheckoutAllowed || isOffDay} pending={isPending} />
                            </form>
                        ) : (
                            <button
                                disabled={status !== 'checked_in'}
                                className="rounded-lg p-0 text-left disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                <Card className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                                    <LogOut className="h-8 w-8 text-muted-foreground" />
                                    <p className="mt-2 text-sm font-medium text-foreground">
                                        {status === 'checked_out' ? 'Sudah Absen Keluar' : 'Absen Keluar'}
                                    </p>
                                </Card>
                            </button>
                        )}
                    </div>
                    <button onClick={() => setActiveView('history')} className="w-full rounded-lg p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <Card className="flex h-full w-full flex-col items-center justify-center p-4 text-center hover:bg-secondary">
                            <BarChart2 className="h-8 w-8 text-primary" />
                            <p className="mt-2 text-sm font-medium text-foreground">Riwayat</p>
                        </Card>
                    </button>
                </div>
            </div>
        </div>
    );
}
