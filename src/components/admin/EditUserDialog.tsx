
'use client';

import { useEffect, useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateUser, type UpdateUserState } from '@/app/actions';
import { Eye, EyeOff } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Guru' | 'Admin';
  nip?: string;
  subject?: string;
  class?: string;
  gender?: string;
  phone?: string;
  address?: string;
}

const updateUserSchema = z.object({
  name: z.string().min(3, "Nama harus memiliki setidaknya 3 karakter."),
  password: z.string().optional(),
  nip: z.string().optional(),
  gender: z.enum(['Laki-laki', 'Perempuan']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  subject: z.string().optional(),
  class: z.string().optional(),
}).refine(data => !data.password || data.password.length >= 6, {
  message: "Kata sandi baru harus memiliki setidaknya 6 karakter.",
  path: ["password"],
});

type UpdateUserForm = z.infer<typeof updateUserSchema>;

interface EditUserDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditUserDialog({ user, open, onOpenChange, onSuccess }: EditUserDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<UpdateUserState>({});

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user.name || '',
      password: '',
      nip: user.nip || '',
      gender: user.gender as 'Laki-laki' | 'Perempuan' | undefined,
      phone: user.phone || '',
      address: user.address || '',
      subject: user.subject || '',
      class: user.class || '',
    },
  });

  useEffect(() => {
    if (state.success) {
      toast({ title: 'Berhasil', description: `Data pengguna '${user.name}' berhasil diperbarui.` });
      onSuccess();
      onOpenChange(false);
    }
    if (state.error) {
      toast({ variant: 'destructive', title: 'Gagal', description: state.error });
    }
  }, [state, toast, onSuccess, onOpenChange, user.name]);

  const onSubmit = (data: UpdateUserForm) => {
    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('role', user.role);

    // Append all fields from the form data
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    startTransition(async () => {
      const result = await updateUser(formData);
      setState(result);
    });
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Pengguna: {user.name}</DialogTitle>
          <DialogDescription>
            Ubah detail untuk pengguna ini. Hanya isi bidang yang ingin Anda ubah.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="max-h-[60vh] -mx-6 px-6">
              <div className="space-y-4 py-4">
                  {/* Informasi Pribadi */}
                  <h3 className="font-semibold text-foreground">Informasi Pribadi</h3>
                  {user.role === 'Guru' && (
                      <div className="space-y-2">
                          <Label htmlFor="nip">NIP</Label>
                          <Input id="nip" {...register('nip')} placeholder="Nomor Induk Pegawai" disabled={isPending} />
                      </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="gender">Jenis Kelamin</Label>
                    <Controller
                        name="gender"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                                <SelectTrigger id="gender">
                                    <SelectValue placeholder="Pilih jenis kelamin" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="phone">No. Telepon</Label>
                      <Input id="phone" {...register('phone')} placeholder="Nomor telepon aktif" disabled={isPending} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="address">Alamat</Label>
                      <Input id="address" {...register('address')} placeholder="Alamat lengkap" disabled={isPending} />
                  </div>
                  
                  <Separator />

                  {/* Informasi Akademik */}
                  {user.role === 'Guru' && (
                      <>
                          <h3 className="font-semibold text-foreground">Informasi Akademik</h3>
                          <div className="space-y-2">
                              <Label htmlFor="subject">Mata Pelajaran</Label>
                              <Input id="subject" {...register('subject')} placeholder="Contoh: Matematika" disabled={isPending} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="class">Mengajar Kelas</Label>
                              <Input id="class" {...register('class')} placeholder="Contoh: 10A, 11B" disabled={isPending} />
                          </div>
                          <Separator />
                      </>
                  )}
                  
                  {/* Informasi Administrasi */}
                  <h3 className="font-semibold text-foreground">Informasi Administrasi</h3>
                  <div className="space-y-2">
                      <Label htmlFor="name">Nama Lengkap</Label>
                      <Input id="name" {...register('name')} placeholder="Nama lengkap pengguna" disabled={isPending} />
                      {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="password">Kata Sandi Baru</Label>
                      <div className="relative">
                          <Input
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              {...register('password')}
                              placeholder="Biarkan kosong jika tidak ingin mengubah"
                              disabled={isPending}
                              className="pr-10"
                          />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(!showPassword)} disabled={isPending}>
                              <span className="sr-only">Toggle password visibility</span>
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </Button>
                      </div>
                      {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
                  </div>
              </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Batal</Button>
            <Button type="submit" disabled={isPending || !isDirty}>
              {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
