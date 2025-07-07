'use client'

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Book, LogOut } from "lucide-react";
import { LogoutDialog } from "@/components/admin/LogoutDialog";
import { useAuth } from "@/hooks/useAuth";

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div className="flex items-center gap-4 py-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium text-foreground">{value}</p>
        </div>
    </div>
);

export function TeacherProfile() {
    const { userProfile, logout } = useAuth();
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);

    if (!userProfile) {
        return <div>Memuat profil...</div>
    }

    return (
        <>
            <div className="bg-gray-50 dark:bg-zinc-900 p-4 min-h-screen">
                <header className="mb-6">
                    <h1 className="text-xl font-bold text-foreground">Profil</h1>
                </header>

                <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={userProfile.avatar} alt={userProfile.name} data-ai-hint="person portrait" />
                        <AvatarFallback>{userProfile.name.slice(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-xl font-bold text-foreground">{userProfile.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{userProfile.role}</p>
                    </div>
                </div>

                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg">Informasi Profil</CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-border pt-0">
                        <InfoRow icon={User} label="Nama Lengkap" value={userProfile.name} />
                        <InfoRow icon={Mail} label="Email" value={userProfile.email} />
                        <InfoRow icon={Book} label="Mata Pelajaran" value={userProfile.subject || 'Tidak diketahui'} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Pengaturan</CardTitle>
                    </CardHeader>
                     <CardContent className="divide-y divide-border pt-0">
                        <button
                            onClick={() => setShowLogoutDialog(true)}
                            className="flex items-center justify-between py-3 w-full text-left"
                        >
                            <div className="flex items-center gap-4 text-destructive">
                                <LogOut className="h-6 w-6" />
                                <span className="font-medium">Keluar</span>
                            </div>
                        </button>
                    </CardContent>
                </Card>
            </div>
            <LogoutDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog} onConfirm={logout} />
        </>
    );
}
