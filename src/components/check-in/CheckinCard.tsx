"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Camera, MapPin, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { handleCheckin, type CheckinState } from "@/app/actions";
import { Progress } from "@/components/ui/progress";

interface CheckinCardProps {
  user: {
    name: string;
    role: "Student" | "Teacher";
  };
  onSuccess?: () => void;
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={disabled || pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Kirim Absensi
    </Button>
  );
}

export function CheckinCard({ user, onSuccess }: CheckinCardProps) {
  const initialState: CheckinState = {};
  const [state, formAction] = useActionState(handleCheckin, initialState);

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  const [resultDialogOpen, setResultDialogOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load from local storage on mount
  useEffect(() => {
    if (isClient) {
      try {
        const savedLocation = localStorage.getItem('checkin_location');
        if (savedLocation) {
          setLocation(JSON.parse(savedLocation));
        }
        const savedPhoto = localStorage.getItem('checkin_photo');
        if (savedPhoto) {
          setPhotoDataUri(savedPhoto);
        }
      } catch (error) {
        console.error("Failed to read from localStorage", error);
        localStorage.clear();
      }
    }
  }, [isClient]);

  // Save location to local storage
  useEffect(() => {
    if (isClient) {
      if (location) {
        localStorage.setItem('checkin_location', JSON.stringify(location));
      } else {
        localStorage.removeItem('checkin_location');
      }
    }
  }, [location, isClient]);

  // Save photo to local storage
  useEffect(() => {
    if (isClient) {
      if (photoDataUri) {
        localStorage.setItem('checkin_photo', photoDataUri);
      } else {
        localStorage.removeItem('checkin_photo');
      }
    }
  }, [photoDataUri, isClient]);


  useEffect(() => {
    if (state.error || state.success || state.isFraudulent) {
      setResultDialogOpen(true);
      if (state.success) {
        if (isClient) {
          localStorage.setItem('checkin_status', 'checked_in');
          localStorage.setItem('checkin_time', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
        }
        setLocation(null); // Clear location from state
        onSuccess?.();
      }
    }
  }, [state, onSuccess, isClient]);

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
        }
      );
    } else {
      setLocationError("Geolocation tidak didukung oleh browser ini.");
    }
  };
  
  const startCamera = () => {
    setCameraError(null);
    setPhotoDataUri(null); // This will trigger the useEffect to remove from localStorage
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
  }, [isCameraOn]);

  const stopCamera = () => {
    setIsCameraOn(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUri = canvas.toDataURL("image/jpeg");
        setPhotoDataUri(dataUri); // This will trigger the useEffect to save to localStorage
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

  return (
    <>
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Hai, {user.name}!</CardTitle>
          <CardDescription>Ikuti langkah-langkah di bawah ini untuk menandai kehadiran Anda.</CardDescription>
          <Progress value={progressValue} className="mt-2" />
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            <input type="hidden" name="photoDataUri" value={photoDataUri || ""} />
            <input type="hidden" name="latitude" value={location?.latitude || ""} />
            <input type="hidden" name="longitude" value={location?.longitude || ""} />
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${location ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                  {location ? <CheckCircle /> : <MapPin />}
                </div>
                <div>
                  <h3 className="font-semibold">Langkah 1: Akses Lokasi</h3>
                  {!location && <p className="text-sm text-muted-foreground">Kami membutuhkan lokasi Anda untuk verifikasi.</p>}
                  {location && <p className="text-sm text-primary">Lokasi berhasil direkam.</p>}
                  {locationError && <p className="text-sm text-destructive">{locationError}</p>}
                </div>
                 {!location && (
                    <Button type="button" onClick={getLocation} className="ml-auto">Aktifkan Lokasi</Button>
                )}
              </div>

              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${photoDataUri ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                  {photoDataUri ? <CheckCircle /> : <Camera />}
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold">Langkah 2: Ambil Foto Selfie</h3>
                  <p className="text-sm text-muted-foreground">Foto Anda digunakan untuk memvalidasi kehadiran Anda.</p>
                  
                  {cameraError && <p className="text-sm text-destructive mt-2">{cameraError}</p>}

                  <div className="mt-2 space-y-2">
                    {isCameraOn && (
                      <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-md border" />
                        <Button type="button" onClick={takePhoto} className="w-full">Ambil Selfie</Button>
                      </>
                    )}

                    {!isCameraOn && photoDataUri && (
                      <>
                        <img src={photoDataUri} alt="User selfie" className="rounded-md border" />
                        <Button type="button" variant="outline" onClick={startCamera} className="w-full">Ambil Ulang Foto</Button>
                      </>
                    )}
                  </div>

                  {location && !isCameraOn && !photoDataUri && (
                     <Button type="button" onClick={startCamera} className="mt-2" disabled={!location}>Mulai Kamera</Button>
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
              {state.isFraudulent && " Silakan hubungi administrator untuk check-in manual."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={onSuccess ? () => {} : resetCheckin}>Tutup</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
