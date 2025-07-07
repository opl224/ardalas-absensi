"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
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
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={disabled || pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Submit Attendance
    </Button>
  );
}

export function CheckinCard({ user }: CheckinCardProps) {
  const initialState: CheckinState = {};
  const [state, formAction] = useFormState(handleCheckin, initialState);

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  
  const [resultDialogOpen, setResultDialogOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (state.error || state.success) {
      setResultDialogOpen(true);
    }
  }, [state]);

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
          setLocationError(`Error: ${error.message}. Please enable location services.`);
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
    }
  };
  
  const startCamera = () => {
    setCameraError(null);
    setPhotoDataUri(null);
    setIsCameraOn(true);
  };

  useEffect(() => {
    if (isCameraOn) {
      let stream: MediaStream;
      const enableCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          setCameraError("Could not access camera. Please grant permission.");
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
  
  const progressValue = (getStep() / 3) * 100;

  return (
    <>
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Hi, {user.name}!</CardTitle>
          <CardDescription>Follow the steps below to mark your attendance.</CardDescription>
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
                  <h3 className="font-semibold">Location Access</h3>
                  {!location && <p className="text-sm text-muted-foreground">We need your location for verification.</p>}
                  {location && <p className="text-sm text-primary">Location captured successfully.</p>}
                  {locationError && <p className="text-sm text-destructive">{locationError}</p>}
                </div>
                 {!location && (
                    <Button type="button" onClick={getLocation} className="ml-auto">Enable Location</Button>
                )}
              </div>

              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${photoDataUri ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                  {photoDataUri ? <CheckCircle /> : <Camera />}
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold">Take a Selfie</h3>
                  <p className="text-sm text-muted-foreground">Your photo is used to validate your presence.</p>
                  
                  {cameraError && <p className="text-sm text-destructive mt-2">{cameraError}</p>}

                  <div className="mt-2 space-y-2">
                    {isCameraOn && (
                      <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-md border" />
                        <Button type="button" onClick={takePhoto} className="w-full">Take Selfie</Button>
                      </>
                    )}

                    {!isCameraOn && photoDataUri && (
                      <>
                        <img src={photoDataUri} alt="User selfie" className="rounded-md border" />
                        <Button type="button" variant="outline" onClick={startCamera} className="w-full">Retake Photo</Button>
                      </>
                    )}
                  </div>

                  {location && !isCameraOn && !photoDataUri && (
                     <Button type="button" onClick={startCamera} className="mt-2" disabled={!location}>Start Camera</Button>
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
              {state.success ? "Success!" : state.isFraudulent ? "Verification Required" : "Error"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {state.reason || state.error || "An unknown issue occurred."}
              {state.isFraudulent && " Please contact an administrator for manual check-in."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={resetCheckin}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
