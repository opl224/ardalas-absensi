'use client';

import { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { handleCheckout, type CheckoutState } from '@/app/actions';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, MapPin, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeacherHomeProps {
  user: {
    name: string;
    role: 'Teacher';
    avatar: string;
    subject: string;
  };
  setActiveView: (view: 'home' | 'history' | 'profile' | 'checkin') => void;
}

type CheckinStatus = 'not_checked_in' | 'checked_in' | 'checked_out';

function CheckoutButton() {
    const { pending } = useFormState(handleCheckout, { success: false });
    return (
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Check Out
      </Button>
    );
}


export function TeacherHome({ user, setActiveView }: TeacherHomeProps) {
    const [dateTime, setDateTime] = useState({ date: '', time: '' });
    const [isClient, setIsClient] = useState(false);
    const [status, setStatus] = useState<CheckinStatus>('not_checked_in');
    const [checkinData, setCheckinData] = useState({ time: '', photo: '' });
    const [checkoutTime, setCheckoutTime] = useState('');

    const { toast } = useToast();

    // Checkout form action
    const initialState: CheckoutState = {};
    const [checkoutState, formAction] = useFormState(handleCheckout, initialState);

    useEffect(() => {
        setIsClient(true);
        const updateDateTime = () => {
            const now = new Date();
            setDateTime({
                date: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
                time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
            });
        };
        updateDateTime();
        const interval = setInterval(updateDateTime, 60000); // Update time every minute
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isClient) {
            const storedStatus = localStorage.getItem('checkin_status') as CheckinStatus | null;
            if (storedStatus) {
                setStatus(storedStatus);
                if (storedStatus === 'checked_in' || storedStatus === 'checked_out') {
                    setCheckinData({
                        time: localStorage.getItem('checkin_time') || '',
                        photo: localStorage.getItem('checkin_photo') || '',
                    });
                }
                if (storedStatus === 'checked_out') {
                    setCheckoutTime(localStorage.getItem('checkout_time') || '');
                }
            }
        }
    }, [isClient, activeView]); // Rerun when returning to home view

    useEffect(() => {
        if (checkoutState.success) {
            const newCheckoutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            setStatus('checked_out');
            setCheckoutTime(newCheckoutTime);
            if(isClient) {
                localStorage.setItem('checkin_status', 'checked_out');
                localStorage.setItem('checkout_time', newCheckoutTime);
            }
            toast({ title: 'Success', description: 'You have been checked out successfully.' });
        }
        if (checkoutState.error) {
            toast({ variant: 'destructive', title: 'Error', description: checkoutState.error });
        }
    }, [checkoutState, toast, isClient]);

    const handleReset = () => {
        if (isClient) {
            localStorage.removeItem('checkin_status');
            localStorage.removeItem('checkin_time');
            localStorage.removeItem('checkout_time');
            localStorage.removeItem('checkin_photo');
            localStorage.removeItem('checkin_location');
            setStatus('not_checked_in');
            setCheckinData({ time: '', photo: ''});
            setCheckoutTime('');
        }
    }

    return (
        <div className="p-4 space-y-6">
            <header>
                <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
            </header>

            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">Hello,</p>
                    <p className="text-2xl font-bold text-foreground">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.role} &bull; {user.subject}</p>
                </div>
                <Avatar className="h-14 w-14">
                    <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person portrait"/>
                    <AvatarFallback>{user.name.slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
            </div>

            <Card className="p-4">
                <CardContent className="p-0 space-y-3">
                    <div className="flex items-center gap-4">
                        <CalendarDays className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-sm text-foreground">{dateTime.date || 'Loading date...'}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-sm text-foreground">{dateTime.time || 'Loading time...'}</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Today's Attendance</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    {status === 'not_checked_in' && (
                        <div className='space-y-4'>
                            <p className="text-muted-foreground">You have not checked in today.</p>
                             <Button className="w-full" onClick={() => setActiveView('checkin')}>Check In</Button>
                        </div>
                    )}
                    {(status === 'checked_in' || status === 'checked_out') && (
                        <>
                            <Badge className="bg-green-500 hover:bg-green-600 text-white py-1 px-4 text-base">Present</Badge>
                            <p className="text-sm text-muted-foreground">Checked in at {checkinData.time}</p>
                            <Avatar className="h-28 w-28 mx-auto">
                                <AvatarImage src={checkinData.photo} alt="Check-in photo" data-ai-hint="person portrait" />
                                <AvatarFallback>ME</AvatarFallback>
                            </Avatar>
                            <div className="text-left space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span className='text-muted-foreground'>Location verified:</span>
                                    <span className='font-medium text-foreground'>Yes</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                    <span className='text-muted-foreground'>Checked out at:</span>
                                    <span className='font-medium text-foreground'>{status === 'checked_out' ? checkoutTime : ' - '}</span>
                                </div>
                            </div>
                            {status === 'checked_in' && (
                                <form action={formAction} className="pt-2">
                                    <CheckoutButton />
                                </form>
                            )}
                        </>
                    )}
                     {status === 'checked_out' && (
                        <Button variant="secondary" className="w-full" onClick={handleReset}>Reset for Demo</Button>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Attendance Statistics</CardTitle>
                </CardHeader>
                 <CardContent className="p-4 pt-0">
                    <div className="flex justify-around text-center">
                        <div>
                            <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">3</div>
                            <p className="mt-2 text-sm font-medium text-muted-foreground">Present</p>
                        </div>
                        <div>
                            <div className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">1</div>
                            <p className="mt-2 text-sm font-medium text-muted-foreground">Absent</p>
                        </div>
                        <div>
                            <div className="w-16 h-16 bg-yellow-400 text-black rounded-full flex items-center justify-center text-2xl font-bold">1</div>
                            <p className="mt-2 text-sm font-medium text-muted-foreground">Late</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}