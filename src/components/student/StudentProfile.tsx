'use client'

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, GraduationCap, LogOut } from "lucide-react";
import { LogoutDialog } from "@/components/admin/LogoutDialog"; 
import { useAuth } from "@/hooks/useAuth";
import { CenteredLottieLoader } from "../ui/lottie-loader";

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div className="flex items-center gap-4 py-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium text-foreground">{value}</p>
        </div>
    </div>
);

export function StudentProfile() {
    const { userProfile, logout } = useAuth();
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    
    if (!userProfile) {
        return <CenteredLottieLoader />;
    }

    return (
        <>
            <div className="bg-gray-50 dark:bg-zinc-900">
                <header className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <h1 className="text-xl font-bold text-foreground">Profil</h1>
                </header>
                <div className="p-4">
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
                            <InfoRow icon={GraduationCap} label="Kelas" value={userProfile.class || 'Tidak diketahui'} />
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
            </div>
            <LogoutDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog} onConfirm={logout} />
        </>
    );
}
