
'use client'

import { useState, useRef, useEffect, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Building2, Shield, ChevronRight, Camera } from "lucide-react";
import { LogoutDialog } from "./LogoutDialog";
import { useAuth } from "@/hooks/useAuth";
import { CenteredLoader } from "../ui/loader";
import { ThemeToggle } from "../ThemeToggle";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Capacitor } from '@capacitor/core';
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface ProfileProps {
    setActiveView: (view: 'privacy', index: number) => void;
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

const ClickableRow = ({ icon: Icon, label, onClick, className, showChevron = true }: { icon: React.ElementType, label: string, onClick?: () => void, className?: string, showChevron?: boolean }) => (
    <button
        onClick={onClick}
        className={cn("flex items-center justify-between py-3 w-full text-left disabled:opacity-50 rounded-md", className)}
        disabled={!onClick}
    >
        <div className="flex items-center gap-4">
            <Icon className="h-6 w-6 text-muted-foreground" />
            <span className="font-medium text-foreground">{label}</span>
        </div>
        {onClick && showChevron && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
    </button>
);

export function Profile({ setActiveView }: ProfileProps) {
    const { userProfile, logout, setUserProfile } = useAuth();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [newAvatarUrl, setNewAvatarUrl] = useState('');
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
    const [isNative, setIsNative] = useState(false);

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
    }, []);

    const handleAvatarUpdate = () => {
        if (!newAvatarUrl || !userProfile) return;

        startTransition(async () => {
            try {
                const adminDocRef = doc(db, 'admin', userProfile.uid);
                await updateDoc(adminDocRef, { avatar: newAvatarUrl });

                setUserProfile(prev => prev ? { ...prev, avatar: newAvatarUrl } : null);
                toast({ title: 'Berhasil', description: 'Avatar berhasil diperbarui.' });
                setIsAvatarDialogOpen(false);
                setNewAvatarUrl('');
            } catch (error) {
                console.error("Error updating avatar:", error);
                toast({ variant: 'destructive', title: 'Gagal', description: "Gagal memperbarui avatar." });
            }
        });
    };

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
                            <AlertDialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Avatar className="h-16 w-16 cursor-pointer">
                                        <AvatarImage src={userProfile.avatar} alt={userProfile.name} data-ai-hint="person portrait" />
                                        <AvatarFallback>{userProfile.name.slice(0,2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Ubah URL Avatar</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Masukkan URL gambar baru untuk avatar profil Anda.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="py-2">
                                        <Label htmlFor="avatar-url" className="sr-only">URL Avatar</Label>
                                        <Input 
                                            id="avatar-url"
                                            placeholder="https://example.com/image.png"
                                            value={newAvatarUrl}
                                            onChange={(e) => setNewAvatarUrl(e.target.value)}
                                        />
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleAvatarUpdate} disabled={isPending || !newAvatarUrl}>
                                            {isPending ? "Menyimpan..." : "Simpan"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                             <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background flex items-center justify-center border">
                                <Camera className="h-4 w-4" />
                            </div>
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
                        <InfoRow icon={Building2} label="Departemen" value="Administrasi" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Pengaturan</CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y divide-border pt-0">
                            <ClickableRow icon={Shield} label="Privasi" onClick={() => setActiveView('privacy', 4)} showChevron={true} />
                        </CardContent>
                    </Card>
                    
                    {!isNative && (
                        <Card>
                            <CardContent className="p-0">
                                <Button 
                                    variant="ghost" 
                                    className="w-full justify-center text-destructive h-full py-3 hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => setShowLogoutDialog(true)}
                                >
                                    Keluar
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
            <LogoutDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog} onConfirm={() => logout("Anda telah berhasil keluar.")} />
        </>
    );
}
