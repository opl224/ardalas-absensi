
'use client'

import { useState, useTransition, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Shield, ChevronRight, Camera, BookCopy, Briefcase } from "lucide-react";
import { LogoutDialog } from "../admin/LogoutDialog";
import { useAuth } from "@/hooks/useAuth";
import { CenteredLoader, Loader } from "../ui/loader";
import { ThemeToggle } from "../ThemeToggle";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { doc, writeBatch } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

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

interface TeacherProfileProps {
  setActiveView?: (view: 'privacy') => void;
}

export function TeacherProfile({ setActiveView }: TeacherProfileProps) {
    const { userProfile, logout, setUserProfile } = useAuth();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && userProfile) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const dataUri = reader.result as string;
                setPreviewAvatar(dataUri);

                startTransition(async () => {
                    try {
                        const storageRef = ref(storage, `avatars/${userProfile.uid}/${Date.now()}`);
                        const snapshot = await uploadString(storageRef, dataUri, 'data_url');
                        const downloadURL = await getDownloadURL(snapshot.ref);

                        const batch = writeBatch(db);
                        const teacherDocRef = doc(db, 'teachers', userProfile.uid);
                        batch.update(teacherDocRef, { avatar: downloadURL });

                        const centralUserDocRef = doc(db, 'users', userProfile.uid);
                        const userDocSnap = await db.collection('users').doc(userProfile.uid).get();
                        if (userDocSnap.exists) {
                            batch.update(centralUserDocRef, { avatar: downloadURL });
                        }

                        await batch.commit();
                        
                        setUserProfile(prev => prev ? { ...prev, avatar: downloadURL } : null);
                        toast({ title: 'Berhasil', description: 'Avatar berhasil diperbarui.' });

                    } catch (error) {
                        console.error("Error updating avatar:", error);
                        toast({ variant: 'destructive', title: 'Gagal', description: "Gagal memperbarui avatar." });
                    } finally {
                        setPreviewAvatar(null);
                        if(fileInputRef.current) fileInputRef.current.value = "";
                    }
                });
            }
        }
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
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/png, image/jpeg"
                            />
                            <Avatar className="h-16 w-16 cursor-pointer" onClick={handleAvatarClick}>
                                <AvatarImage src={previewAvatar || userProfile.avatar} alt={userProfile.name} data-ai-hint="person portrait" />
                                <AvatarFallback>{userProfile.name.slice(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background flex items-center justify-center border">
                                {isPending ? (
                                    <Loader className="h-4 w-4" />
                                ) : (
                                    <Camera className="h-4 w-4" />
                                )}
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
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Informasi Akademik</CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y divide-border pt-0">
                            <InfoRow icon={BookCopy} label="Mata Pelajaran" value={userProfile.subject || 'Belum diatur'} />
                            <InfoRow icon={Briefcase} label="Mengajar Kelas" value={userProfile.class || 'Belum diatur'} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Pengaturan</CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y divide-border pt-0">
                            <ClickableRow icon={Shield} label="Privasi" onClick={() => setActiveView?.('privacy')} showChevron={true} />
                        </CardContent>
                    </Card>

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
                </div>
            </div>
            <LogoutDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog} onConfirm={() => logout("Anda telah berhasil keluar.")} />
        </>
    );
}

