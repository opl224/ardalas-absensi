
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Camera, MapPin, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { LottieLoader } from "../ui/lottie-loader";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { handleCheckin, type CheckinState } from "@/app/actions";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CheckinCardProps {
  onSuccess?: () => void;
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={disabled || pending}>
      {pending && <LottieLoader size={24} />}
      Kirim Absensi
    </Button>
  );
}

export function CheckinCard({ onSuccess }: CheckinCardProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const initialState: CheckinState = {};
  const [state, formAction] = useActionState(handleCheckin, initialState);

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  
  const [resultDialogOpen, setResultDialogOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (state.error || state.success || state.isFraudulent) {
      setResultDialogOpen(true);
      if (state.success && onSuccess) {
        onSuccess();
      }
    }
  }, [state, onSuccess]);

  const getLocation = () => {
    setLocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          setLocationError(`Kesalahan: ${error.message}. Harap aktifkan layanan lokasi.`);
          toast({ variant: 'destructive', title: 'Kesalahan Lokasi', description: `Kesalahan: ${error.message}. Harap aktifkan layanan lokasi.` });
        }
      );
    } else {
      setLocationError("Geolocation tidak didukung oleh browser ini.");
      toast({ variant: 'destructive', title: 'Kesalahan Lokasi', description: "Geolocation tidak didukung oleh browser ini." });
    }
  };
  
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
        } catch (err) {
          setCameraError("Tidak dapat mengakses kamera. Harap berikan izin.");
          toast({ variant: 'destructive', title: 'Kesalahan Kamera', description: "Tidak dapat mengakses kamera. Harap berikan izin." });
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
    setResultDialogOpen(false);
  }

  const getStep = () => {
    if (!location) return 1;
    if (!photoDataUri) return 2;
    return 3;
  }
  
  const progressValue = (getStep() - 1) * 50;

  if (!userProfile) {
    return <Card className="w-full max-w-lg shadow-lg p-8 text-center">Memuat data pengguna...</Card>;
  }

  return (
    <>
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Hai, {userProfile.name}!</CardTitle>
          <CardDescription>Ikuti langkah-langkah di bawah ini untuk menandai kehadiran Anda.</CardDescription>
          <Progress value={progressValue} className="mt-2" />
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            <input type="hidden" name="photoDataUri" value={photoDataUri || ""} />
            <input type="hidden" name="latitude" value={location?.latitude || ""} />
            <input type="hidden" name="longitude" value={location?.longitude || ""} />
            <input type="hidden" name="userId" value={userProfile.uid || ""} />
            <input type="hidden" name="userName" value={userProfile.name || ""} />
            <input type="hidden" name="userRole" value={userProfile.role || ""} />
            <input type="hidden" name="clientTime" value={new Date().toTimeString().substring(0, 5)} />
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${location ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                  {location ? <CheckCircle /> : <MapPin />}
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold">Langkah 1: Akses Lokasi</h3>
                  <p className="text-sm text-muted-foreground">Kami membutuhkan lokasi Anda untuk verifikasi.</p>
                  {!location ? (
                    <Button type="button" onClick={getLocation} className="mt-2">Aktifkan Lokasi</Button>
                  ) : (
                     <p className="text-sm text-primary mt-2">Lokasi berhasil direkam.</p>
                  )}
                  {locationError && <p className="text-sm text-destructive mt-1">{locationError}</p>}
                </div>
              </div>

              <div>
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${photoDataUri ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                    {photoDataUri ? <CheckCircle /> : <Camera />}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold">Langkah 2: Ambil Foto Selfie</h3>
                    <p className="text-sm text-muted-foreground">Foto Anda digunakan untuk memvalidasi kehadiran Anda.</p>
                    
                    {location && !isCameraOn && !photoDataUri && (
                       <Button type="button" onClick={startCamera} className="mt-2" disabled={!location}>Mulai Kamera</Button>
                    )}
                    {cameraError && <p className="text-sm text-destructive mt-2">{cameraError}</p>}
                  </div>
                </div>

                <div className="mt-2 space-y-2">
                   {/* Video element is always in the DOM to prevent race conditions, but hidden with CSS */}
                   <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn("w-full aspect-video rounded-md border", {
                      "hidden": !isCameraOn,
                    })}
                  />
                  
                  {/* Show the taken photo when camera is off */}
                  {photoDataUri && !isCameraOn && (
                    <img src={photoDataUri} alt="User selfie" className="w-full aspect-video object-cover rounded-md border" />
                  )}

                  {/* Show take photo button only when camera is on */}
                  {isCameraOn && (
                    <Button type="button" onClick={takePhoto} className="w-full">Ambil Selfie</Button>
                  )}

                  {/* Show retake photo button only after a photo is taken */}
                  {photoDataUri && !isCameraOn && (
                    <Button type="button" variant="outline" onClick={startCamera} className="w-full">Ambil Ulang Foto</Button>
                  )}
                </div>
              </div>

              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            <CardFooter className="p-0 pt-4">
                <SubmitButton disabled={!photoDataUri || !location} />
            </CardFooter>
          </form>
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
            <AlertDialogAction onClick={onSuccess ? onSuccess : resetCheckin}>Tutup</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
