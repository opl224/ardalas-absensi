
'use client'

import { useState, useTransition, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { createUser, type CreateUserState } from '@/app/actions';

interface AddUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ADMIN_CODE = "1234";

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
    const [role, setRole] = useState<'guru' | 'admin'>('guru');
    const [adminCode, setAdminCode] = useState('');
    const [state, setState] = useState<CreateUserState>({});
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        if (!open) {
            // Reset form state when dialog is closed
            setRole('guru');
            setAdminCode('');
            setState({});
        }
    }, [open]);

    useEffect(() => {
        if (state.success) {
            toast({ title: 'Berhasil', description: 'Pengguna baru berhasil dibuat.' });
            onOpenChange(false);
        }
        if (state.error) {
            toast({ variant: 'destructive', title: 'Gagal', description: state.error });
        }
    }, [state, toast, onOpenChange]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (role === 'admin' && adminCode !== ADMIN_CODE) {
            toast({ variant: 'destructive', title: 'Gagal', description: 'Kode admin salah.' });
            return;
        }

        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
            const result = await createUser(formData);
            setState(result);
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tambah Pengguna Baru</DialogTitle>
                    <DialogDescription>
                        Isi detail di bawah ini untuk membuat akun pengguna baru.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nama Lengkap</Label>
                        <Input id="name" name="name" required disabled={isPending} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" required disabled={isPending} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="password">Kata Sandi</Label>
                        <Input id="password" name="password" type="password" required disabled={isPending} />
                    </div>
                    <div className="space-y-2">
                        <Label>Peran Pengguna</Label>
                        <RadioGroup
                            name="role"
                            value={role}
                            onValueChange={(value: 'guru' | 'admin') => setRole(value)}
                            className="flex gap-4"
                            disabled={isPending}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="guru" id="r-guru" />
                                <Label htmlFor="r-guru">Guru</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="admin" id="r-admin" />
                                <Label htmlFor="r-admin">Admin</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {role === 'admin' && (
                        <div className="space-y-2">
                            <Label htmlFor="adminCode">Kode Admin</Label>
                            <Input
                                id="adminCode"
                                name="adminCode"
                                type="password"
                                placeholder="Masukkan kode untuk membuat admin"
                                value={adminCode}
                                onChange={(e) => setAdminCode(e.target.value)}
                                required
                                disabled={isPending}
                            />
                        </div>
                    )}
                    <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-y-2 sm:gap-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Membuat...' : 'Buat Pengguna'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
