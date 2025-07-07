'use client'

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Clock, Users, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ActiveView = 'home' | 'profile' | 'users' | 'reports' | 'attendance';

export function MobileHome({ setActiveView }: { setActiveView: (view: ActiveView) => void }) {
    const [dateTime, setDateTime] = useState({ date: '', time: '' });

    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date();
            // Mocking date to match the image
            const mockDate = new Date('2025-07-07T12:33:00');
            setDateTime({
                date: mockDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
                time: mockDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
            });
        };

        updateDateTime();
        // No interval to keep the date static as in the image
    }, []);

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>

            {/* Welcome Section */}
            <div className="flex items-center justify-between mt-6">
                <div>
                    <p className="text-sm text-muted-foreground">Welcome back,</p>
                    <p className="text-2xl font-bold text-foreground">Admin User</p>
                    <p className="text-sm text-muted-foreground">System Administrator</p>
                </div>
                <Avatar className="h-14 w-14">
                    <AvatarImage src="https://placehold.co/100x100.png" alt="Admin User" data-ai-hint="person portrait" />
                    <AvatarFallback>AU</AvatarFallback>
                </Avatar>
            </div>

            {/* Date and Time */}
            <Card className="mt-6 p-4">
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

            {/* Today's Overview */}
            <Card className="mt-6">
                <CardHeader className="p-4">
                    <CardTitle className="text-lg">Today's Overview</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="flex justify-around text-center">
                        <div>
                            <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">45</div>
                            <p className="mt-2 text-sm font-medium text-muted-foreground">Present</p>
                        </div>
                        <div>
                            <div className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">5</div>
                            <p className="mt-2 text-sm font-medium text-muted-foreground">Absent</p>
                        </div>
                        <div>
                            <div className="w-16 h-16 bg-yellow-400 text-black rounded-full flex items-center justify-center text-2xl font-bold">3</div>
                            <p className="mt-2 text-sm font-medium text-muted-foreground">Late</p>
                        </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="flex justify-between items-center text-sm">
                        <p className="font-medium text-foreground">Overall Attendance Rate</p>
                        <p className="font-bold text-primary text-base">85%</p>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 mt-6">
                <Card onClick={() => setActiveView('users')} className="p-4 flex flex-col items-center justify-center text-center h-28 hover:bg-accent cursor-pointer">
                    <Users className="h-8 w-8 text-primary" />
                    <p className="mt-2 font-medium text-sm text-foreground">Manage Users</p>
                </Card>
                <Card onClick={() => setActiveView('reports')} className="p-4 flex flex-col items-center justify-center text-center h-28 hover:bg-accent cursor-pointer">
                    <FileText className="h-8 w-8 text-primary" />
                    <p className="mt-2 font-medium text-sm text-foreground">View Reports</p>
                </Card>
            </div>
        </div>
    );
}
