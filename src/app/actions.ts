'use server'

import { validateAttendance, ValidateAttendanceInput } from "@/ai/flows/attendance-validator";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
import { doc, setDoc, collection, serverTimestamp, updateDoc } from "firebase/firestore"; 
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

// Helper function to convert data URI to Blob
function dataURItoBlob(dataURI: string) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
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

    if (!photoDataUri.startsWith('data:image/')) {
        return { error: 'Data gambar tidak valid. Silakan ambil ulang foto selfie Anda.' };
    }

    // 1. Upload selfie to Supabase
    const photoBlob = dataURItoBlob(photoDataUri);
    const photoPath = `${userId}/${new Date().toISOString()}.jpg`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('selfies')
      .upload(photoPath, photoBlob, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase Upload Error:', uploadError);
      return { error: 'Gagal mengunggah foto. Silakan coba lagi.' };
    }

    const { data: { publicUrl } } = supabase.storage.from('selfies').getPublicUrl(photoPath);

    // 2. Call AI Validator
    const aiInput: ValidateAttendanceInput = {
      photoDataUri,
      latitude,
      longitude,
      expectedLocation: {
        latitude: -6.2088, // Lokasi sekolah statis untuk sekarang
        longitude: 106.8456,
        radius: 500,
      },
    };

    const result = await validateAttendance(aiInput);
    
    // 3. Save attendance record to Firestore
    const attendanceRecord = {
      userId,
      name: userName,
      role: userRole,
      checkInTime: serverTimestamp(),
      checkInLocation: { latitude, longitude },
      checkInPhotoUrl: publicUrl,
      isFraudulent: result.isFraudulent,
      fraudReason: result.reason,
      status: result.isFraudulent ? "Penipuan" : "Hadir", // Atau 'Terlambat'
    };

    const attendanceRef = doc(collection(db, "attendance"));
    await setDoc(attendanceRef, attendanceRecord);

    if (result.isFraudulent) {
      return { isFraudulent: true, reason: result.reason };
    }

    return { success: true, reason: "Absensi berhasil ditandai!" };

  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : "Terjadi kesalahan yang tidak terduga.";
    return { error: `Kesalahan server: ${errorMessage} Silakan coba lagi.` };
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

        const attendanceRef = doc(db, "attendance", attendanceId);
        await updateDoc(attendanceRef, {
            checkOutTime: serverTimestamp(),
            status: 'Hadir', // Assuming they are not "late" anymore when checking out
        });
        
        return { success: true };
    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "Terjadi kesalahan yang tidak terduga.";
        return { error: `Kesalahan server: ${errorMessage} Silakan coba lagi.` };
    }
}
