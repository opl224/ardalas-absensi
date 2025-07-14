
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
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
    const [isNative, setIsNative] = useState(false);

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
    }, []);

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
            setPreviewAvatar(dataUri); // Set preview immediately
            
            startTransition(async () => {
                try {
                    const storage = getStorage();
                    const filePath = `avatars/${userProfile.uid}/${new Date().getTime()}_${file.name}`;
                    const fileRef = storageRef(storage, filePath);

                    const snapshot = await uploadString(fileRef, dataUri, 'data_url');
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    
                    const batch = writeBatch(db);

                    const collectionName = userProfile.role === 'admin' ? 'admin' : 'teachers';
                    const mainDocRef = doc(db, collectionName, userProfile.uid);
                    batch.update(mainDocRef, { avatar: downloadURL });
                    
                    const centralUserDocRef = doc(db, 'users', userProfile.uid);
                    batch.update(centralUserDocRef, { avatar: downloadURL });

                    await batch.commit();

                    setUserProfile(prev => prev ? { ...prev, avatar: downloadURL } : null);

                    toast({ title: 'Berhasil', description: 'Avatar berhasil diperbarui.' });
                } catch (error) {
                    console.error("Error updating avatar:", error);
                    toast({ variant: 'destructive', title: 'Gagal', description: "Gagal mengunggah avatar." });
                } finally {
                    setPreviewAvatar(null); // Clear preview after operation
                }
            });
        };
        event.target.value = '';
    };

    if (!userProfile) {
        return <CenteredLoader />;
    }
    
    const displayAvatar = previewAvatar || userProfile.avatar;

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
                                <AvatarImage src={displayAvatar} alt={userProfile.name} data-ai-hint="person portrait" />
                                <AvatarFallback>{userProfile.name.slice(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                             <Button
                                size="icon"
                                variant="outline"
                                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background"
                                onClick={handleAvatarClick}
                                disabled={isPending}
                            >
                                {isPending ? <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Camera className="h-4 w-4" />}
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
