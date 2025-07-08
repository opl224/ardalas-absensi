'use client';

import { useState } from 'react';
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
import { Loader } from '@/components/ui/loader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAccessDeniedDialog, setShowAccessDeniedDialog] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user role from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role;

        if (role === 'siswa') {
            await signOut(auth);
            setShowAccessDeniedDialog(true);
            setLoading(false);
            return;
        }

        const idToken = await user.getIdToken();
        
        // Set cookie to manage session
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        // Redirect based on role
        if (role === 'admin') {
          router.push('/admin/dashboard');
        } else if (role === 'guru') {
          router.push('/teacher/dashboard');
        } else {
          throw new Error('Peran pengguna tidak dikenali.');
        }
      } else {
        throw new Error('Data pengguna tidak ditemukan.');
      }

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Gagal Masuk',
        description: error.message || 'Email atau kata sandi salah. Silakan coba lagi.',
      });
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
                <CardDescription>Portal Masuk Admin & Guru</CardDescription>
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
                <Button type="submit" className="w-full !mt-6" size="lg" disabled={loading}>
                  {loading && <Loader scale={0.48} />}
                  Masuk
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <AlertDialog open={showAccessDeniedDialog} onOpenChange={setShowAccessDeniedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Akses Ditolak</AlertDialogTitle>
            <AlertDialogDescription>
              Halaman ini hanya untuk Admin dan Guru. Anda tidak memiliki izin untuk mengakses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => window.location.reload()}>Kembali</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
