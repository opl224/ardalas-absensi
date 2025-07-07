'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic otentikasi akan ditambahkan di sini di aplikasi sungguhan.
    // Untuk saat ini, kita tidak melakukan apa-apa.
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card className="shadow-lg">
          <CardHeader className="items-center text-center space-y-4 pt-8">
            <Avatar className="h-20 w-20">
              <AvatarImage src="https://placehold.co/100x100.png" alt="School Logo" data-ai-hint="logo abstract" />
              <AvatarFallback>SA</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="font-headline text-2xl">Absensi Sekolah</CardTitle>
              <CardDescription>Masuk untuk melanjutkan</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <form className="space-y-4" onSubmit={handleSignIn}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="Masukkan email Anda" className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Kata Sandi</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Masukkan kata sandi Anda" className="pl-10 pr-10" required />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                    <span className="sr-only">{showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}</span>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full !mt-6" size="lg">Masuk</Button>
            </form>
            
            <div className="mt-6 space-y-3">
              <p className="text-center text-sm text-muted-foreground">Akun Demo:</p>
              <div className="grid grid-cols-3 gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/dashboard">Admin</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/teacher/dashboard">Guru</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/student/dashboard">Siswa</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
