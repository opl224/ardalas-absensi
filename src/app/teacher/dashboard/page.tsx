
'use client';

import { CenteredLoader } from "@/components/ui/loader";
import { MobileTeacherDashboard } from "@/components/teacher/MobileTeacherDashboard";
import dynamic from 'next/dynamic'
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/ui/download-button";

function TeacherDashboardContent() {
  const { userProfile, loading, logout } = useAuth();
  const [isNativePlatform, setIsNativePlatform] = useState(false);
  const [platformCheckCompleted, setPlatformCheckCompleted] = useState(false);

  useEffect(() => {
    const checkPlatform = () => {
      setIsNativePlatform(Capacitor.isNativePlatform());
      setPlatformCheckCompleted(true);
    };
    checkPlatform();
  }, []);

  if (loading || !platformCheckCompleted) {
    return <CenteredLoader />;
  }
  
  if (!isNativePlatform) {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-8 text-center">
            <Smartphone className="h-16 w-16 text-primary mb-4" />
            <h1 className="text-2xl font-bold">Akses Ditolak di Browser</h1>
            <p className="text-muted-foreground mt-2 max-w-sm">
                Untuk pengalaman terbaik dan melakukan absensi, silakan gunakan aplikasi Android yang telah disediakan.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                <div className="flex flex-col items-center gap-2">
                    <Button onClick={() => logout()} className="w-40">
                        Kembali ke Login
                    </Button>
                    <p className="text-xs text-muted-foreground">Keluar & kembali</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <DownloadButton />
                    <p className="text-xs text-muted-foreground">Unduh APK</p>
                </div>
            </div>
        </div>
    );
  }
  
  if (!userProfile) {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <p>Profil pengguna tidak dapat dimuat. Mencoba mengalihkan...</p>
        </div>
    );
  }

  return (
    <>
      <MobileTeacherDashboard />
    </>
  );
}

export default dynamic(() => Promise.resolve(TeacherDashboardContent), {
  ssr: false,
  loading: () => <CenteredLoader />,
});
