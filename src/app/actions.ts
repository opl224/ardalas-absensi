
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
  clientTime: z.string().regex(/^\d{2}:\d{2}$/), // "HH:mm"
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

// This function is still used by other components (e.g., Attendance.tsx)
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
      clientTime: formData.get("clientTime"),
    });

    if (!validatedFields.success) {
        console.error("Validation Error:", validatedFields.error.flatten().fieldErrors);
      return { error: "Data masukan tidak valid. Silakan coba lagi." };
    }

    const { photoDataUri, latitude, longitude, userId, userName, userRole, clientTime } = validatedFields.data;
    const now = new Date(); // Official timestamp from server (UTC)

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
    
    // --- TIMEZONE-SAFE TIME LOGIC ---
    // All comparisons are done using minutes from midnight based on the client's local time.
    const checkInEndStr = settings.checkInEnd || '09:00';

    // Defensively parse grace period to ensure it is a valid number.
    let gracePeriodMinutes = Number(settings.gracePeriod ?? 60);
    if (isNaN(gracePeriodMinutes)) {
        gracePeriodMinutes = 60; // Default to 60 if parsing fails to prevent NaN errors.
    }
    
    const [endHours, endMinutes] = checkInEndStr.split(':').map(Number);
    const checkInEndTotalMinutes = endHours * 60 + endMinutes;

    // This is the absolute deadline. After this, the user is marked 'Tidak Hadir'.
    const absentDeadlineMinutes = checkInEndTotalMinutes + gracePeriodMinutes;

    const [clientHours, clientMinutes] = clientTime.split(':').map(Number);
    const clientTotalMinutes = clientHours * 60 + clientMinutes;


    // Logic for ABSENT (based on client time)
    // If the user tries to check in after the absolute deadline, record them as 'Tidak Hadir' and stop.
    if (clientTotalMinutes > absentDeadlineMinutes) {
        const absentRecord = {
            userId,
            name: userName,
            role: userRole,
            checkInTime: now,
            checkInLocation: { latitude, longitude },
            checkInPhotoUrl: null,
            isFraudulent: false,
            fraudReason: '',
            status: "Tidak Hadir",
        };
        const attendanceRef = doc(collection(db, "photo_attendances"));
        await setDoc(attendanceRef, absentRecord);
        return { success: true, reason: "Waktu absen masuk telah berakhir. Anda telah ditandai sebagai Tidak Hadir." };
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
    
    // Determine status based on time (using client time)
    // If client time is after the check-in end time, they are late. Otherwise, they are present.
    // The grace period ONLY determines absence, not lateness.
    const finalStatus = clientTotalMinutes > checkInEndTotalMinutes ? "Terlambat" : "Hadir";

    // 3. Save attendance record to Firestore
    const attendanceRecord = {
      userId,
      name: userName,
      role: userRole,
      checkInTime: now, // The official timestamp is always the server's UTC time
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
        
        const attendanceRef = doc(db, "photo_attendances", attendanceId);
        
        // Simply update the checkout time. The status is determined at check-in and should not change.
        await updateDoc(attendanceRef, {
            checkOutTime: new Date(),
        });
        
        return { success: true };
    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "Terjadi kesalahan yang tidak terduga.";
        return { error: `Kesalahan server: ${errorMessage}.` };
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

const avatarUpdateSchema = z.object({
  userId: z.string().min(1),
  userRole: z.enum(['admin', 'guru', 'siswa']),
  photoDataUri: z.string().startsWith('data:image/'),
});

export type AvatarUpdateState = {
    success?: boolean;
    error?: string;
    newAvatarUrl?: string;
};

export async function updateAvatar(prevState: AvatarUpdateState, formData: FormData): Promise<AvatarUpdateState> {
    const validatedFields = avatarUpdateSchema.safeParse({
        userId: formData.get('userId'),
        userRole: formData.get('userRole'),
        photoDataUri: formData.get('photoDataUri'),
    });

    if (!validatedFields.success) {
        console.error("Validation Error:", validatedFields.error.flatten().fieldErrors);
        return { error: "Data masukan tidak valid." };
    }

    const { userId, userRole, photoDataUri } = validatedFields.data;

    try {
        const photoBlob = dataURItoBlob(photoDataUri);
        const fileExtension = photoBlob.type.split('/')[1] || 'jpg';
        const photoPath = `avatars/${userId}/${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from('selfies')
          .upload(photoPath, photoBlob, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
            console.error('Supabase Upload Error:', uploadError);
            return { error: `Gagal mengunggah avatar: ${uploadError.message}.` };
        }

        const { data: urlData } = supabase.storage.from('selfies').getPublicUrl(photoPath);
        if (!urlData || !urlData.publicUrl) {
            return { error: 'Gagal mendapatkan URL publik untuk avatar.' };
        }
        const publicUrl = urlData.publicUrl;
        
        let collectionName = '';
        if (userRole === 'guru') {
            collectionName = 'teachers';
        } else if (userRole === 'admin' || userRole === 'siswa') {
            collectionName = 'users';
        } else {
             return { error: 'Peran pengguna tidak valid.' };
        }

        const userDocRef = doc(db, collectionName, userId);

        await updateDoc(userDocRef, {
            avatar: publicUrl,
        });

        return { success: true, newAvatarUrl: publicUrl };

    } catch (e) {
        console.error('An error occurred during avatar update:', e);
        const errorMessage = e instanceof Error ? e.message : "Terjadi kesalahan yang tidak terduga.";
        return { error: `Kesalahan server: ${errorMessage}.` };
    }
}
