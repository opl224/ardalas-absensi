'use client';

import { useActionState, useState, useEffect } from 'react';
import { handleCheckout, type CheckoutState } from '@/app/actions';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { BarChart2, CalendarDays, Clock, MapPin, CheckCircle, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFormStatus } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import { CenteredLottieLoader, LottieLoader } from '../ui/lottie-loader';

interface TeacherHomeProps {
  setActiveView: (view: 'home' | 'history' | 'profile' | 'checkin') => void;
}

type CheckinStatus = 'not_checked_in' | 'checked_in' | 'checked_out';

function CheckoutButton() {
    const { pending } = useFormStatus();
    return (
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <LottieLoader size={24} />}
        Check Out
      </Button>
    );
}

function QuickCheckoutButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" disabled={pending} className="w-full text-left p-0 rounded-lg hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50">
            <Card className="w-full h-full p-4 flex flex-col items-center justify-center text-center">
                {pending ? (
                    <LottieLoader size={32} />
                ) : (
                    <LogOut className="h-8 w-8 text-primary" />
                )}
                <p className="mt-2 font-medium text-sm text-foreground">Check Out</p>
            </Card>
        </button>
    )
}


export function TeacherHome({ setActiveView }: TeacherHomeProps) {
    const [dateTime, setDateTime] = useState({ date: '', time: '' });
    const [status, setStatus] = useState<CheckinStatus>('not_checked_in');
    const [checkinData, setCheckinData] = useState({ time: '', photo: '', attendanceId: '' });
    const [checkoutTime, setCheckoutTime] = useState('');

    const { userProfile } = useAuth();
    const { toast } = useToast();

    // Checkout form action
    const initialState: CheckoutState = {};
    const [checkoutState, formAction] = useActionState(handleCheckout, initialState);

    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date();
            setDateTime({
                date: now.toLocaleDateString('id-ID', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
                time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: true })
            });
        };
        updateDateTime();
        const interval = setInterval(updateDateTime, 60000); // Update time every minute
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
      // TODO: Fetch latest attendance status from Firestore
    }, [userProfile]);


    useEffect(() => {
        if (checkoutState.success) {
            setStatus('checked_out');
            toast({ title: 'Berhasil', description: 'Anda telah berhasil check out.' });
        }
        if (checkoutState.error) {
            toast({ variant: 'destructive', title: 'Kesalahan', description: checkoutState.error });
        }
    }, [checkoutState, toast]);

    const handleReset = () => {
      setStatus('not_checked_in');
    }

    if (!userProfile) {
        return <CenteredLottieLoader />;
    }

    return (
        <div className="p-4 space-y-6">
            <header>
                <h1 className="text-xl font-bold text-foreground">Dasbor</h1>
            </header>

            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">Halo,</p>
                    <p className="text-2xl font-bold text-foreground">{userProfile.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{userProfile.role} &bull; {userProfile.subject}</p>
                </div>
                <Avatar className="h-14 w-14">
                    <AvatarImage src={userProfile.avatar} alt={userProfile.name} data-ai-hint="person portrait"/>
                    <AvatarFallback>{userProfile.name.slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
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
                    {status === 'not_checked_in' && (
                        <div className='space-y-4'>
                            <p className="text-muted-foreground">Anda belum check-in hari ini.</p>
                             <Button className="w-full" onClick={() => setActiveView('checkin')}>Check In</Button>
                        </div>
                    )}
                    {(status === 'checked_in' || status === 'checked_out') && (
                        <>
                            <Badge className="bg-green-500 hover:bg-green-600 text-white py-1 px-4 text-base">Hadir</Badge>
                            <p className="text-sm text-muted-foreground">Check in pada {checkinData.time}</p>
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
                                    <span className='text-muted-foreground'>Check out pada:</span>
                                    <span className='font-medium text-foreground'>{status === 'checked_out' ? checkoutTime : ' - '}</span>
                                </div>
                            </div>
                            {status === 'checked_in' && (
                                <form action={formAction}>
                                    <input type="hidden" name="userId" value={userProfile.uid} />
                                    <input type="hidden" name="attendanceId" value={checkinData.attendanceId} />
                                    <CheckoutButton />
                                </form>
                            )}
                        </>
                    )}
                     {status === 'checked_out' && (
                        <Button variant="secondary" className="w-full" onClick={handleReset}>Reset untuk Demo</Button>
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
                        <Card className="flex h-full w-full flex-col items-center justify-center p-4 text-center hover:bg-accent">
                            <CheckCircle className={`h-8 w-8 ${status === 'not_checked_in' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <p className="mt-2 text-sm font-medium text-foreground">
                                {status === 'not_checked_in' ? 'Check In' : 'Sudah Check In'}
                            </p>
                        </Card>
                    </button>
                    {status === 'checked_in' ? (
                        <form action={formAction}>
                            <input type="hidden" name="userId" value={userProfile.uid} />
                            <input type="hidden" name="attendanceId" value={checkinData.attendanceId} />
                            <QuickCheckoutButton />
                        </form>
                    ) : (
                        <button
                            disabled
                            className="rounded-lg p-0 text-left disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <Card className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                                <LogOut className="h-8 w-8 text-muted-foreground" />
                                <p className="mt-2 text-sm font-medium text-foreground">
                                    {status === 'checked_out' ? 'Sudah Check Out' : 'Check Out'}
                                </p>
                            </Card>
                        </button>
                    )}
                </div>
                <button onClick={() => setActiveView('history')} className="w-full rounded-lg p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <Card className="flex h-full w-full flex-col items-center justify-center p-4 text-center hover:bg-accent">
                        <BarChart2 className="h-8 w-8 text-primary" />
                        <p className="mt-2 text-sm font-medium text-foreground">Riwayat</p>
                    </Card>
                </button>
            </div>
        </div>
    );
}
