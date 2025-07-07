'use client'

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Book, LogOut, ChevronRight } from "lucide-react";
import { LogoutDialog } from "@/components/admin/LogoutDialog"; // Reusing admin logout dialog

interface TeacherProfileProps {
  user: {
    name: string;
    role: 'Teacher';
    avatar: string;
    subject: string;
  };
}

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div className="flex items-center gap-4 py-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium text-foreground">{value}</p>
        </div>
    </div>
);

export function TeacherProfile({ user }: TeacherProfileProps) {
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    return (
        <>
            <div className="bg-gray-50 dark:bg-zinc-900 p-4 min-h-screen">
                <header className="mb-6">
                    <h1 className="text-xl font-bold text-foreground">Profile</h1>
                </header>

                <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person portrait" />
                        <AvatarFallback>{user.name.slice(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-xl font-bold text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.role}</p>
                    </div>
                </div>

                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg">Profile Information</CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-border pt-0">
                        <InfoRow icon={User} label="Full Name" value={user.name} />
                        <InfoRow icon={Mail} label="Email" value={`${user.name.toLowerCase().replace(' ', '.')}@school.edu`} />
                        <InfoRow icon={Book} label="Subject" value={user.subject} />
                    </CardContent>
                </Card>

                <Card>
                     <CardContent className="divide-y divide-border p-0">
                        <button
                            onClick={() => setShowLogoutDialog(true)}
                            className="flex items-center justify-between py-3 px-4 w-full text-left"
                        >
                            <div className="flex items-center gap-4 text-destructive">
                                <LogOut className="h-6 w-6" />
                                <span className="font-medium">Logout</span>
                            </div>
                        </button>
                    </CardContent>
                </Card>
            </div>
            <LogoutDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog} />
        </>
    );
}