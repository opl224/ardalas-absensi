
'use client'

import { useState, useRef, useEffect, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, GraduationCap, Camera } from "lucide-react";
import { LogoutDialog } from "../admin/LogoutDialog";
import { useAuth } from "@/hooks/useAuth";
import { CenteredLoader } from "../ui/loader";
import { ThemeToggle } from "../ThemeToggle";
import { Button } from "../ui/button";
import { updateAvatar, type AvatarUpdateState } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);

    const [state, setState] = useState<AvatarUpdateState>({});
    
    const handleAvatarClick = () => {
        if (isPending) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !userProfile) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const dataUri = reader.result as string;
            const formData = new FormData();
            formData.append('photoDataUri', dataUri);
            formData.append('userId', userProfile.uid);
            formData.append('userRole', userProfile.role);
            
            startTransition(async () => {
                const result = await updateAvatar(formData);
                setState(result);
            });
        };
        event.target.value = '';
    };

    useEffect(() => {
        if (!state) return;

        if (state.success) {
            toast({ title: 'Berhasil', description: 'Avatar berhasil diperbarui.' });
        }
        if (state.error) {
            toast({ variant: 'destructive', title: 'Gagal', description: state.error });
        }
    }, [state, toast]);
    
    if (!userProfile) {
        return <CenteredLoader />;
    }

    return (
        <>
            <div className="bg-gray-50 dark:bg-zinc-900">
                <header className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <h1 className="text-xl font-bold text-foreground">Profil</h1>
                </header>
                <div className="p-4 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            <Avatar className="h-16 w-16 cursor-pointer" onClick={handleAvatarClick}>
                                <AvatarImage src={state.newAvatarUrl || userProfile.avatar} alt={userProfile.name} data-ai-hint="person portrait" />
                                <AvatarFallback>{userProfile.name.slice(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                             <Button
                                size="icon"
                                variant="outline"
                                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background"
                                onClick={handleAvatarClick}
                                disabled={isPending}
                            >
                                <Camera className="h-4 w-4" />
                                <span className="sr-only">Ubah Avatar</span>
                            </Button>
                        </div>
                         <div className="flex-grow min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-xl font-bold text-foreground truncate">{userProfile.name}</p>
                                    <p className="text-sm text-muted-foreground capitalize">{userProfile.role}</p>
                                </div>
                                <ThemeToggle />
                            </div>
                        </div>
                    </div>

                    <Card>
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
                        <CardContent className="p-0">
                           <Button
                                onClick={() => setShowLogoutDialog(true)}
                                variant="ghost" 
                                className="w-full justify-center text-destructive h-full py-3 hover:bg-destructive/10 hover:text-destructive"
                            >
                                Keluar
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <LogoutDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog} onConfirm={() => logout("Anda telah berhasil keluar.")} />
        </>
    );
}
