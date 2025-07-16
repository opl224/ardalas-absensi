
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
import { Eye, EyeOff, ShieldKeyhole } from 'lucide-react';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut, updateProfile } from 'firebase/auth';
import { auth, db }from '@/lib/firebase';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

const createUserSchema = z.object({
  name: z.string().min(3, "Nama harus memiliki setidaknya 3 karakter."),
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(6, "Kata sandi harus memiliki setidaknya 6 karakter."),
  role: z.enum(['admin', 'guru'], { required_error: "Peran harus dipilih." }),
  adminCode: z.string().optional(),
}).refine(data => {
    if (data.role === 'admin') {
        return data.adminCode === '1234';
    }
    return true;
}, {
    message: "Kode admin tidak valid.",
    path: ['adminCode'],
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
  const { user: adminUser, userProfile: adminProfile } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: 'guru',
    }
  });

  const selectedRole = watch('role');

  const onSubmit = (data: CreateUserForm) => {
    startTransition(async () => {
      // 1. Temporarily create a new auth instance for user creation
      // This is a common pattern to create users without signing out the admin.
      const { initializeApp } = await import('firebase/app');
      const { getAuth: getAuthInstance } = await import('firebase/auth');
      const tempApp = initializeApp(auth.app.options, "temp-user-creation-app");
      const tempAuth = getAuthInstance(tempApp);
      
      try {
        // 2. Create user in the temporary instance
        const userCredential = await createUserWithEmailAndPassword(tempAuth, data.email, data.password);
        const newUser = userCredential.user;
        
        await updateProfile(newUser, { displayName: data.name });

        // 3. Create Firestore documents in a batch for atomicity
        const batch = writeBatch(db);

        // a. Main document in role-specific collection
        const collectionName = data.role === 'admin' ? 'admin' : 'teachers';
        const userDocRef = doc(db, collectionName, newUser.uid);
        batch.set(userDocRef, {
            name: data.name,
            email: data.email,
            role: data.role,
            uid: newUser.uid,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`
        });

        // b. Central 'users' document for simple role lookup
        const centralUserDocRef = doc(db, 'users', newUser.uid);
        batch.set(centralUserDocRef, {
            role: data.role,
            email: data.email,
            name: data.name,
        });

        await batch.commit();
        
        // 4. Send verification email
        await sendEmailVerification(newUser);
        
        toast({ title: 'Berhasil', description: `Pengguna '${data.name}' berhasil dibuat. Email verifikasi telah dikirim.` });
        onSuccess();
        handleClose();

      } catch (error: any) {
        let errorMessage = 'Terjadi kesalahan yang tidak terduga.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Alamat email ini sudah digunakan oleh akun lain.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Format email tidak valid.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
        }
        console.error("Error creating user:", error);
        toast({ variant: 'destructive', title: 'Gagal Membuat Akun', description: errorMessage });
      } finally {
        // 5. Clean up the temporary auth instance
        await signOut(tempAuth);
        const { deleteApp } = await import('firebase/app');
        await deleteApp(tempApp);
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
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input id="name" {...register('name')} placeholder="contoh: Opal" disabled={isPending} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} placeholder="contoh: opal@gmail.com" disabled={isPending} />
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
                    <RadioGroupItem value="guru" id="role-guru" />
                    <Label htmlFor="role-guru">Guru</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="admin" id="role-admin" />
                    <Label htmlFor="role-admin">Admin</Label>
                  </div>
                </RadioGroup>
              )}
            />
            {errors.role && <p className="text-destructive text-xs">{errors.role.message}</p>}
          </div>

          {selectedRole === 'admin' && (
            <div className="space-y-2">
                <Label htmlFor="adminCode">Kode Admin</Label>
                <div className="relative">
                    <ShieldKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        id="adminCode" 
                        type="password" 
                        {...register('adminCode')} 
                        placeholder="Masukkan kode rahasia admin" 
                        className="pl-10" 
                        disabled={isPending} 
                    />
                </div>
                {errors.adminCode && <p className="text-destructive text-xs">{errors.adminCode.message}</p>}
            </div>
          )}

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
