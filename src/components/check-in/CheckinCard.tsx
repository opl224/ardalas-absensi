
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, MapPin, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import SplitText from "@/components/ui/SplitText";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { doc, setDoc, collection, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface CheckinCardProps {
  onSuccess?: () => void;
}

type CheckinState = {
  isFraudulent?: boolean;
  reason?: string;
  error?: string;
  success?: boolean;
}

function SubmitButton({ disabled, pending }: { disabled: boolean; pending: boolean; }) {
  return (
    <Button type="submit" className="w-full" disabled={disabled || pending}>
      {pending ? 'Mengirim...' : 'Kirim Absensi'}
    </Button>
  );
}

const splitTextFrom = { opacity: 0, y: 20 };
const splitTextTo = { opacity: 1, y: 0 };

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; 
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export function CheckinCard({ onSuccess }: CheckinCardProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [state, setState] = useState<CheckinState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  
  const [resultDialogOpen, setResultDialogOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (state.error || state.success || state.isFraudulent) {
      setResultDialogOpen(true);
    }
  }, [state]);

  const requestLocation = useCallback(() => {
    setIsGettingLocation(true);
    setLocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setIsGettingLocation(false);
        },
        (error) => {
          let message = "Anda harus memberikan izin lokasi untuk melanjutkan.";
           if (error.code === error.PERMISSION_DENIED) {
            message = "Izin lokasi ditolak. Silakan aktifkan lokasi di pengaturan ponsel anda dan coba lagi.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = "Informasi lokasi tidak tersedia saat ini. Pastikan GPS Anda aktif.";
          } else if (error.code === error.TIMEOUT) {
            message = "Gagal mendapatkan lokasi: Waktu habis. Pastikan koneksi internet dan GPS stabil. dan jangan lupa aktifkan lokasi di pengaturan";
          }
          setLocationError(message);
          toast({ variant: 'destructive', title: 'Kesalahan Lokasi', description: message });
          setIsGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    } else {
      const errorMsg = "Geolocation tidak didukung oleh browser ini.";
      setLocationError(errorMsg);
      toast({ variant: 'destructive', title: 'Kesalahan Lokasi', description: errorMsg });
      setIsGettingLocation(false);
    }
  }, [toast]);
  
  const startCamera = () => {
    setCameraError(null);
    setPhotoDataUri(null);
    setIsCameraOn(true);
  };

  useEffect(() => {
    let stream: MediaStream;
    if (isCameraOn) {
      const enableCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err: any) {
          let message = "Tidak dapat mengakses kamera. Harap periksa pengaturan perangkat Anda.";
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              message = "Izin kamera ditolak. Silakan aktifkan di pengaturan browser atau aplikasi Anda, lalu coba lagi.";
          }
          setCameraError(message);
          toast({ variant: 'destructive', title: 'Kesalahan Kamera', description: message });
          setIsCameraOn(false);
        }
      };
      enableCamera();

      return () => {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        if(videoRef.current) {
            videoRef.current.srcObject = null;
        }
      }
    }
  }, [isCameraOn, toast]);

  const stopCamera = () => {
    setIsCameraOn(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const MAX_WIDTH = 600; // Resize to max 600px width

      const aspectRatio = video.videoWidth / video.videoHeight;
      canvas.width = MAX_WIDTH;
      canvas.height = MAX_WIDTH / aspectRatio;

      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL("image/jpeg", 0.7); // 70% quality JPEG
        setPhotoDataUri(dataUri);
        stopCamera();
      }
    }
  };

  const resetCheckin = () => {
    setPhotoDataUri(null);
    setLocation(null);
    setLocationError(null);
    setResultDialogOpen(false);
    setState({});
  }

  const getStep = () => {
    if (!location) return 1;
    if (!photoDataUri) return 2;
    return 3;
  }
  
  const progressValue = (getStep() - 1) * 50;
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userProfile || !location || !photoDataUri) {
        toast({ variant: "destructive", title: "Data tidak lengkap", description: "Pastikan lokasi dan foto sudah terisi."});
        return;
    }
    
    setIsSubmitting(true);
    
    try {
        const { latitude, longitude } = location;
        const now = new Date(); 
        const clientTime = now.toTimeString().substring(0, 5);

        const settingsRef = doc(db, "settings", "attendance");
        const settingsDoc = await getDoc(settingsRef);
        if (!settingsDoc.exists()) {
            throw new Error("Pengaturan absensi belum dikonfigurasi.");
        }
        
        const settings = settingsDoc.data();
        const schoolLatitude = settings.schoolLatitude ?? -6.241169;
        const schoolLongitude = settings.schoolLongitude ?? 107.037800;
        const schoolRadius = settings.schoolRadius ?? 100;
        const gracePeriod = settings.gracePeriod ?? 60;
        const checkInEndValue = settings.checkInEnd;
        const checkInEndStr = (typeof checkInEndValue === 'string' && checkInEndValue.includes(':'))
          ? checkInEndValue
          : '09:00';
    
        let gracePeriodMinutes = Number(gracePeriod);
        if (isNaN(gracePeriodMinutes)) {
            gracePeriodMinutes = 60; 
        }
        
        const [endHours, endMinutes] = checkInEndStr.split(':').map(Number);
        const checkInEndTotalMinutes = endHours * 60 + endMinutes;
        const absentDeadlineMinutes = checkInEndTotalMinutes + gracePeriodMinutes;

        const [clientHours, clientMinutes] = clientTime.split(':').map(Number);
        const clientTotalMinutes = clientHours * 60 + clientMinutes;

        if (clientTotalMinutes > absentDeadlineMinutes) {
            const absentRecord = {
                userId: userProfile.uid,
                name: userProfile.name,
                role: userProfile.role,
                checkInTime: now,
                checkInLocation: { latitude, longitude },
                checkInPhotoUrl: null,
                isFraudulent: false,
                fraudReason: '',
                status: "Tidak Hadir",
            };
            const attendanceRef = doc(collection(db, "photo_attendances"));
            await setDoc(attendanceRef, absentRecord);
            setState({ success: true, reason: "Waktu absen masuk telah berakhir. Anda telah ditandai sebagai Tidak Hadir." });
            return;
        }

        const distance = calculateDistance(latitude, longitude, schoolLatitude, schoolLongitude);
        
        let isFraudulent = false;
        let fraudReason = '';

        if (distance > schoolRadius) {
            isFraudulent = true;
            fraudReason = `Anda berada ${Math.round(distance)} meter dari lokasi sekolah, yang berada di luar radius ${schoolRadius} meter yang diizinkan.`;
        }
        
        const finalStatus = clientTotalMinutes > checkInEndTotalMinutes ? "Terlambat" : "Hadir";

        const attendanceRecord = {
          userId: userProfile.uid,
          name: userProfile.name,
          role: userProfile.role,
          checkInTime: now,
          checkInLocation: { latitude, longitude },
          checkInPhotoUrl: photoDataUri,
          isFraudulent,
          fraudReason,
          status: finalStatus,
        };

        const attendanceRef = doc(collection(db, "photo_attendances"));
        await setDoc(attendanceRef, attendanceRecord);

        if (isFraudulent) {
          setState({ isFraudulent: true, reason: fraudReason, success: true });
        } else {
            setShowSuccessAnimation(true);
            setTimeout(() => {
                setShowSuccessAnimation(false);
                setState({ success: true, reason: `Absensi berhasil ditandai sebagai ${finalStatus}!` });
            }, 1500);
        }

    } catch (e: any) {
        console.error('An error occurred during check-in:', e);
        const errorMessage = e instanceof Error ? e.message : "Terjadi kesalahan yang tidak terduga.";
        setState({ error: `Kesalahan: ${errorMessage}. Silakan coba lagi.` });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!userProfile) {
    return <Card className="w-full max-w-lg shadow-lg p-8 text-center">Memuat data pengguna...</Card>;
  }

  return (
    <>
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <div className="flex items-baseline font-headline text-2xl">
              <span>Hai,&nbsp;</span>
              <SplitText
                  text={`${userProfile.name}!`}
                  delay={120}
                  duration={0.8}
                  ease="power3.out"
                  splitType="chars"
                  from={splitTextFrom}
                  to={splitTextTo}
                  textAlign="left"
                  className="font-headline text-2xl"
              />
          </div>
          <CardDescription>Ikuti langkah-langkah di bawah ini untuk menandai kehadiran Anda.</CardDescription>
          <Progress value={progressValue} className="mt-2" />
        </CardHeader>
        <CardContent>
          {showSuccessAnimation ? (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
              <p className="text-lg font-medium text-success mt-4">Absensi Berhasil!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${location ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                    {location ? <CheckCircle /> : <MapPin />}
                  </div>
                  <div>
                    <h3 className="font-semibold">Langkah 1: Verifikasi Lokasi</h3>
                    {!location && !isGettingLocation && (
                      <>
                          <p className="text-sm text-muted-foreground">Klik tombol untuk mengaktifkan dan memverifikasi lokasi Anda.</p>
                          <Button type="button" variant="default" onClick={requestLocation} className="mt-2">
                              <MapPin className="mr-2 h-4 w-4" />
                              Aktifkan Lokasi
                          </Button>
                      </>
                    )}
                    {isGettingLocation && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <span>Mendapatkan lokasi Anda...</span>
                      </div>
                    )}
                    {location && !isGettingLocation && (
                       <p className="text-sm text-primary mt-2">Lokasi berhasil diverifikasi.</p>
                    )}
                    {locationError && !isGettingLocation && (
                      <div className="mt-2 space-y-2">
                        <p className="text-sm text-destructive mt-1">{locationError}</p>
                        <Button type="button" variant="default" onClick={requestLocation}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Coba Lagi
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${photoDataUri ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                    {photoDataUri ? <CheckCircle /> : <Camera />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold">Langkah 2: Ambil Foto Selfie</h3>
                    <p className="text-sm text-muted-foreground">Foto Anda digunakan untuk memvalidasi kehadiran Anda.</p>
                  </div>
                </div>
              </div>

              {location && (
                  <div className="mt-4 space-y-2">
                      {!isCameraOn && !photoDataUri && (
                          <Button type="button" onClick={startCamera} className="w-full" disabled={!location}>Mulai Kamera</Button>
                      )}
                      {cameraError && !isCameraOn && (
                        <div className="mt-2 space-y-2">
                            <p className="text-sm text-destructive mt-2">{cameraError}</p>
                            <Button type="button" onClick={startCamera} className="w-full" variant="outline">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Coba Lagi
                            </Button>
                        </div>
                      )}

                      <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className={cn("w-full aspect-[3/4] object-cover rounded-md border", {
                              "hidden": !isCameraOn,
                          })}
                      />
                      <canvas ref={canvasRef} className="hidden"></canvas>
                      
                      {photoDataUri && !isCameraOn && (
                          <img src={photoDataUri} alt="User selfie" className="w-full aspect-[3/4] object-cover rounded-md border" />
                      )}

                      {isCameraOn && (
                          <Button type="button" onClick={takePhoto} className="w-full">Ambil Selfie</Button>
                      )}

                      {photoDataUri && !isCameraOn && (
                          <Button type="button" variant="outline" onClick={startCamera} className="w-full">Ambil Ulang Foto</Button>
                      )}
                  </div>
              )}
              
              <CardFooter className="p-0 pt-6">
                  <SubmitButton disabled={!photoDataUri || !location} pending={isSubmitting} />
              </CardFooter>
            </form>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {state.success && <CheckCircle className="text-primary" />}
              {state.isFraudulent && <AlertTriangle className="text-destructive" />}
              {state.error && <XCircle className="text-destructive" />}
              {state.success ? "Berhasil!" : state.isFraudulent ? "Verifikasi Diperlukan" : "Kesalahan"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {state.reason || state.error || "Terjadi masalah yang tidak diketahui."}
              {state.isFraudulent && " Silakan hubungi administrator untuk absen masuk manual."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
                if (state.success && onSuccess) {
                    onSuccess();
                } else {
                    resetCheckin();
                }
            }}>Tutup</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
