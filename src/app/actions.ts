'use server'

import { supabase } from "@/lib/supabase";
import { z } from "zod";
import { doc, setDoc, collection, updateDoc, getDoc } from "firebase/firestore"; 
import { db } from "@/lib/firebase";

const checkinSchema = z.object({
  photoDataUri: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  userId: z.string(),
  userName: z.string(),
  userRole: z.string(),
});

export type CheckinState = {
  isFraudulent?: boolean;
  reason?: string;
  error?: string;
  success?: boolean;
}

// Helper function to convert data URI to Blob using Buffer for server-side reliability
function dataURItoBlob(dataURI: string) {
    const base64 = dataURI.split(',')[1];
    if (!base64) {
        throw new Error('Invalid data URI');
    }
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const buffer = Buffer.from(base64, 'base64');
    return new Blob([buffer], { type: mimeString });
}

// Helper function to get today's date with a specific time
function getTodayAtTime(timeString: string): Date {
    const today = new Date();
    const [hours, minutes] = timeString.split(':').map(Number);
    today.setHours(hours, minutes, 0, 0);
    return today;
}

// Helper function to calculate distance between two lat/lon points in meters (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
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


export async function handleCheckin(
  prevState: CheckinState,
  formData: FormData
): Promise<CheckinState> {
  try {
    const validatedFields = checkinSchema.safeParse({
      photoDataUri: formData.get("photoDataUri"),
      latitude: Number(formData.get("latitude")),
      longitude: Number(formData.get("longitude")),
      userId: formData.get("userId"),
      userName: formData.get("userName"),
      userRole: formData.get("userRole"),
    });

    if (!validatedFields.success) {
        console.error("Validation Error:", validatedFields.error.flatten().fieldErrors);
      return { error: "Data masukan tidak valid. Silakan coba lagi." };
    }

    const { photoDataUri, latitude, longitude, userId, userName, userRole } = validatedFields.data;

    // Get attendance settings
    const settingsRef = doc(db, "settings", "attendance");
    const settingsDoc = await getDoc(settingsRef);
    if (!settingsDoc.exists()) {
        return { error: "Pengaturan absensi belum dikonfigurasi. Silakan hubungi admin." };
    }
    
    let settings = settingsDoc.data();
    const schoolLatitude = -6.241169;
    const schoolLongitude = 107.037800;
    const schoolRadius = 100; // in meters

    // Check and set default school location if not present
    if (
        settings.schoolLatitude === undefined ||
        settings.schoolLongitude === undefined ||
        settings.schoolRadius === undefined ||
        settings.gracePeriod === undefined
    ) {
        await setDoc(settingsRef, { schoolLatitude, schoolLongitude, schoolRadius, gracePeriod: 60 }, { merge: true });
        settings = { ...settings, schoolLatitude, schoolLongitude, schoolRadius, gracePeriod: 60 };
    }
    
    // Check timing logic
    const now = new Date();
    const checkInEnd = getTodayAtTime(settings.checkInEnd);
    const gracePeriodMinutes = settings.gracePeriod ?? 60;
    const checkInGraceEnd = new Date(checkInEnd.getTime() + gracePeriodMinutes * 60 * 1000);

    // Logic for ABSENT
    if (now > checkInGraceEnd) {
        const absentRecord = {
            userId,
            name: userName,
            role: userRole,
            checkInTime: now,
            checkInLocation: { latitude, longitude },
            checkInPhotoUrl: null,
            isFraudulent: false,
            fraudReason: '',
            status: "Absen",
        };
        const attendanceRef = doc(collection(db, "photo_attendances"));
        await setDoc(attendanceRef, absentRecord);
        return { success: true, reason: "Waktu absen masuk telah berakhir. Anda telah ditandai sebagai Absen." };
    }

    // Logic for HADIR or TERLAMBAT
    if (!photoDataUri.startsWith('data:image/')) {
        return { error: 'Data gambar tidak valid. Silakan ambil ulang foto selfie Anda.' };
    }

    // 1. Upload selfie to Supabase
    const photoBlob = dataURItoBlob(photoDataUri);
    const photoPath = `${userId}/${new Date().toISOString()}.jpg`;
    
    const { error: uploadError } = await supabase.storage
      .from('selfies')
      .upload(photoPath, photoBlob, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase Upload Error:', uploadError);
      return { error: `Gagal mengunggah foto: ${uploadError.message}. Pastikan konfigurasi Supabase Anda benar dan bucket 'selfies' ada.` };
    }

    const { data: urlData } = supabase.storage.from('selfies').getPublicUrl(photoPath);

    if (!urlData || !urlData.publicUrl) {
        return { error: 'Gagal mendapatkan URL publik untuk foto. Silakan coba lagi.' };
    }
    const publicUrl = urlData.publicUrl;

    // 2. Location Validation (No AI)
    const distance = calculateDistance(latitude, longitude, settings.schoolLatitude, settings.schoolLongitude);
    
    let isFraudulent = false;
    let fraudReason = '';

    if (distance > settings.schoolRadius) {
        isFraudulent = true;
        fraudReason = `Anda berada ${Math.round(distance)} meter dari lokasi sekolah, yang berada di luar radius ${settings.schoolRadius} meter yang diizinkan.`;
    }
    
    // Determine status based on time
    const finalStatus = now > checkInEnd ? "Terlambat" : "Hadir";

    // 3. Save attendance record to Firestore
    const attendanceRecord = {
      userId,
      name: userName,
      role: userRole,
      checkInTime: now,
      checkInLocation: { latitude, longitude },
      checkInPhotoUrl: publicUrl,
      isFraudulent,
      fraudReason,
      status: finalStatus,
    };

    const attendanceRef = doc(collection(db, "photo_attendances"));
    await setDoc(attendanceRef, attendanceRecord);

    if (isFraudulent) {
      return { isFraudulent: true, reason: fraudReason, success: true };
    }

    return { success: true, reason: `Absensi berhasil ditandai sebagai ${finalStatus}!` };

  } catch (e) {
    console.error('An error occurred during check-in:', e);
    const errorMessage = e instanceof Error ? e.message : "Terjadi kesalahan yang tidak terduga.";
    return { error: `Kesalahan server: ${errorMessage}. Silakan coba lagi.` };
  }
}


export type CheckoutState = {
    success?: boolean;
    error?: string;
};

export async function handleCheckout(prevState: CheckoutState, formData: FormData): Promise<CheckoutState> {
    try {
        const userId = formData.get("userId") as string;
        const attendanceId = formData.get("attendanceId") as string;

        if (!userId || !attendanceId) {
            return { error: "Informasi pengguna atau absensi tidak ditemukan." };
        }
        
        // Fetch attendance settings
        const settingsDoc = await getDoc(doc(db, "settings", "attendance"));
        if (!settingsDoc.exists()) {
            return { error: "Pengaturan absensi belum dikonfigurasi. Silakan hubungi admin." };
        }
        const settings = settingsDoc.data();
        
        const now = new Date();
        const checkOutEnd = getTodayAtTime(settings.checkOutEnd);

        const attendanceRef = doc(db, "photo_attendances", attendanceId);
        const attendanceSnap = await getDoc(attendanceRef);
        
        if (!attendanceSnap.exists()) {
            return { error: "Catatan kehadiran tidak ditemukan." };
        }
        const currentData = attendanceSnap.data();
        const currentStatus = currentData.status;

        // If checkout is late and status was 'Hadir', update to 'Terlambat'.
        // Otherwise, keep the current status (e.g., if they were already 'Terlambat' on check-in).
        const newStatus = now > checkOutEnd && currentStatus === 'Hadir' ? 'Terlambat' : currentStatus;

        await updateDoc(attendanceRef, {
            checkOutTime: now,
            status: newStatus,
        });
        
        return { success: true };
    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "Terjadi kesalahan yang tidak terduga.";
        return { error: `Kesalahan server: ${errorMessage}. Silakan coba lagi.` };
    }
}

const settingsSchema = z.object({
  checkInStart: z.string().regex(/^\d{2}:\d{2}$/),
  checkInEnd: z.string().regex(/^\d{2}:\d{2}$/),
  checkOutStart: z.string().regex(/^\d{2}:\d{2}$/),
  checkOutEnd: z.string().regex(/^\d{2}:\d{2}$/),
  gracePeriod: z.coerce.number().min(0, "Toleransi tidak boleh negatif."),
  offDays: z.array(z.string()).optional().default([]),
});

export type SettingsState = {
  success?: boolean;
  error?: string | null;
}

export async function updateAttendanceSettings(prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  try {
    const validatedFields = settingsSchema.safeParse({
      checkInStart: formData.get("checkInStart"),
      checkInEnd: formData.get("checkInEnd"),
      checkOutStart: formData.get("checkOutStart"),
      checkOutEnd: formData.get("checkOutEnd"),
      gracePeriod: formData.get("gracePeriod"),
      offDays: formData.getAll("offDays"),
    });

    if (!validatedFields.success) {
      console.error("Validation Error:", validatedFields.error.flatten().fieldErrors);
      return { error: validatedFields.error.flatten().fieldErrors.gracePeriod?.[0] || "Data masukan tidak valid." };
    }

    const settingsRef = doc(db, "settings", "attendance");
    await setDoc(settingsRef, validatedFields.data, { merge: true });

    return { success: true, error: null };
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : "Terjadi kesalahan yang tidak terduga.";
    return { success: false, error: `Kesalahan server: ${errorMessage}` };
  }
}
