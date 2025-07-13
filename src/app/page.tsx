
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from '@/components/ui/checkbox';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showDesktopAccessDeniedDialog, setShowDesktopAccessDeniedDialog] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkDeviceSize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkDeviceSize();
    window.addEventListener('resize', checkDeviceSize);

    // Load saved credentials from localStorage
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }

    return () => window.removeEventListener('resize', checkDeviceSize);
  }, []);

  useEffect(() => {
    const logoutMessage = sessionStorage.getItem('logoutMessage');
    if (logoutMessage) {
      toast({
        title: 'Telah Keluar',
        description: logoutMessage,
      });
      sessionStorage.removeItem('logoutMessage');
    }
  }, [toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Handle "Remember Me" logic
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }

      // Check admin collection first
      const adminDocRef = doc(db, 'admin', user.uid);
      const adminDoc = await getDoc(adminDocRef);

      if (adminDoc.exists()) {
        const userData = adminDoc.data();
        const role = userData.role;

        if (role === 'admin') {
            const idToken = await user.getIdToken();
            await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken }),
            });
            router.push('/admin/dashboard');
            return;
        }
      }

      // If not admin, check teachers collection
      const teacherDocRef = doc(db, 'teachers', user.uid);
      const teacherDoc = await getDoc(teacherDocRef);
      if (teacherDoc.exists()) {
          const teacherData = teacherDoc.data();
          if (teacherData.role === 'guru') {
            if (isDesktop) {
                await signOut(auth);
                setShowDesktopAccessDeniedDialog(true);
                setLoading(false);
                return;
            }
            const idToken = await user.getIdToken();
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });
            router.push('/teacher/dashboard');
            return;
          }
      }

      // If user exists in Auth but not in Firestore collections
      await signOut(auth);
      toast({
          variant: 'destructive',
          title: 'Gagal Masuk',
          description: 'Profil pengguna tidak ditemukan di basis data. Silakan hubungi administrator.',
      });
      

    } catch (error: any) {
      console.error("Login Error: ", error);
      let description = 'Email atau kata sandi salah.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = 'Kombinasi email dan kata sandi tidak cocok.';
      } else if (error.code === 'auth/invalid-credential') {
        description = 'Kredensial yang diberikan tidak valid.';
      }
      toast({
        variant: 'destructive',
        title: 'Gagal Masuk',
        description: description,
      });
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm">
          <Card className="shadow-lg">
            <CardHeader className="items-center text-center space-y-4 pt-8">
              <Avatar className="h-20 w-20">
                <AvatarImage src="/logo.png" alt="School Logo" />
                <AvatarFallback>SA</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <CardTitle className="font-headline text-2xl">Absensi Sekolah</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-2">
              <form className="space-y-4" onSubmit={handleSignIn}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Masukkan email Anda" 
                      className="pl-10" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Kata Sandi</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Masukkan kata sandi Anda" 
                      className="pl-10 pr-10" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                      <span className="sr-only">{showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}</span>
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember-me" 
                      checked={rememberMe} 
                      onCheckedChange={() => setTimeout(() => setRememberMe(!rememberMe), 0)}
                    />
                    <Label htmlFor="remember-me" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Ingatkan Saya
                    </Label>
                </div>
                <Button type="submit" className="w-full !mt-6" size="lg" disabled={loading}>
                  Masuk
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <AlertDialog open={showDesktopAccessDeniedDialog} onOpenChange={setShowDesktopAccessDeniedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Akses Ditolak di Perangkat Ini</AlertDialogTitle>
            <AlertDialogDescription>
              Untuk keamanan dan validasi lokasi, akun guru hanya dapat diakses melalui perangkat seluler.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDesktopAccessDeniedDialog(false)}>Mengerti</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
