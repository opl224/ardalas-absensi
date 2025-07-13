
'use client';

import { useState } from 'react';
import { createAdminUser } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

export default function SetupPage() {
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateAdmin = async () => {
    setLoading(true);
    setResult(null);
    const res = await createAdminUser();
    setResult(res);
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setup Admin Awal</CardTitle>
          <CardDescription>
            Klik tombol di bawah untuk membuat pengguna admin pertama. Ini hanya perlu dilakukan sekali.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={handleCreateAdmin} disabled={loading} className="w-full">
              {loading ? 'Membuat...' : 'Buat Pengguna Admin'}
            </Button>
            {result && (
              <Alert variant={result.error ? 'destructive' : 'default'}>
                <AlertTitle>{result.error ? 'Error' : 'Berhasil'}</AlertTitle>
                <AlertDescription>
                  {result.error || result.success}
                </AlertDescription>
              </Alert>
            )}
            {result?.success && (
                <Button asChild variant="outline" className="w-full">
                    <Link href="/">Kembali ke Halaman Login</Link>
                </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Pengguna akan dibuat dengan email: <strong>admin@sdn.id</strong> dan password: <strong>123456</strong>.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
