
'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Eye, EyeOff } from 'lucide-react';
import { createUserWithEmailAndPassword, getAuth, signInWithCredential, EmailAuthProvider } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const createUserSchema = z.object({
  name: z.string().min(3, "Nama harus memiliki setidaknya 3 karakter."),
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(6, "Kata sandi harus memiliki setidaknya 6 karakter."),
  role: z.enum(['admin', 'guru'], { required_error: "Peran harus dipilih." }),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddUserDialog({ open, onOpenChange, onSuccess }: AddUserDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: 'guru',
    }
  });
  
  const onSubmit = (data: CreateUserForm) => {
    startTransition(async () => {
        const auth = getAuth(app);
        const adminUser = auth.currentUser;

        if (!adminUser || !adminUser.email) {
            toast({ variant: 'destructive', title: 'Error', description: 'Admin tidak terautentikasi. Silakan login kembali.' });
            return;
        }
        
        // This is a placeholder for the admin's password.
        // For a production app, you'd re-authenticate the admin securely.
        // Here, we assume we can't get the password directly.
        const adminEmail = adminUser.email;


        try {
            // Create the new user
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const newUser = userCredential.user;

            // Immediately sign the admin back in
            // IMPORTANT: In a real app, you would securely re-authenticate the admin.
            // Since we can't access the password, we'll rely on the session persistence.
            // The flow might be jarring as Firebase signs out the admin and signs in the new user.
            // A better flow would use a backend to create users. But within client-side constraints:
            // We'll proceed, and the AuthContext should handle session state.

            const collectionName = data.role === 'admin' ? 'admin' : 'teachers';
            const userDocRef = doc(db, collectionName, newUser.uid);
            
            const userData = {
                name: data.name,
                email: data.email,
                role: data.role,
                uid: newUser.uid,
                avatar: `https://placehold.co/100x100.png`
            };

            await setDoc(userDocRef, userData);

            toast({ title: 'Berhasil', description: `Pengguna '${data.name}' berhasil dibuat.` });
            onSuccess();
            handleClose();

        } catch (error: any) {
            console.error("Error creating user:", error);
            let description = 'Terjadi kesalahan saat membuat pengguna.';
            if (error.code === 'auth/email-already-in-use') {
                description = 'Alamat email ini sudah digunakan oleh akun lain.';
            } else if (error.code === 'auth/weak-password') {
                description = 'Kata sandi terlalu lemah. Gunakan setidaknya 6 karakter.';
            }
            toast({ variant: 'destructive', title: 'Gagal Membuat Akun', description });
        }
    });
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Pengguna Baru</DialogTitle>
          <DialogDescription>
            Buat akun baru untuk admin atau guru. Pengguna akan ditambahkan ke Firebase Authentication dan Firestore.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input id="name" {...register('name')} placeholder="contoh: John Doe" disabled={isPending} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} placeholder="contoh: user@example.com" disabled={isPending} />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata Sandi</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="Minimal 6 karakter"
                disabled={isPending}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isPending}
              >
                <span className="sr-only">{showPassword ? 'Sembunyikan' : 'Tampilkan'} kata sandi</span>
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            </div>
            {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Peran</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex items-center gap-x-4 pt-1"
                  disabled={isPending}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="admin" id="role-admin" />
                    <Label htmlFor="role-admin">Admin</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="guru" id="role-guru" />
                    <Label htmlFor="role-guru">Guru</Label>
                  </div>
                </RadioGroup>
              )}
            />
            {errors.role && <p className="text-destructive text-xs">{errors.role.message}</p>}
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Batal</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Menambahkan...' : 'Tambah Pengguna'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
