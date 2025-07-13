
'use server';

import { z } from "zod";
import { doc, setDoc, collection, updateDoc, getDoc, Timestamp, deleteField } from "firebase/firestore"; 
import { db } from "@/lib/firebase";
import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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
    
    const settings = settingsDoc.data();

    // Defensively get all required settings with defaults to prevent crashes
    const schoolLatitude = settings.schoolLatitude ?? -6.241169;
    const schoolLongitude = settings.schoolLongitude ?? 107.037800;
    const schoolRadius = settings.schoolRadius ?? 100;
    const gracePeriod = settings.gracePeriod ?? 60;
    const checkInEndValue = settings.checkInEnd;
    const checkInEndStr = (typeof checkInEndValue === 'string' && checkInEndValue.includes(':'))
      ? checkInEndValue
      : '09:00';

    // Self-healing: If any core values were missing, write them back to Firestore.
    if (
        settings.schoolLatitude === undefined ||
        settings.schoolLongitude === undefined ||
        settings.schoolRadius === undefined ||
        settings.gracePeriod === undefined
    ) {
        await setDoc(settingsRef, { 
            schoolLatitude, 
            schoolLongitude, 
            schoolRadius, 
            gracePeriod 
        }, { merge: true });
    }
    
    // --- TIMEZONE-SAFE TIME LOGIC ---
    let gracePeriodMinutes = Number(gracePeriod);
    if (isNaN(gracePeriodMinutes)) {
        gracePeriodMinutes = 60; // Final fallback if data is malformed
    }
    
    const [endHours, endMinutes] = checkInEndStr.split(':').map(Number); // This is safe now
    const checkInEndTotalMinutes = endHours * 60 + endMinutes;

    const absentDeadlineMinutes = checkInEndTotalMinutes + gracePeriodMinutes;

    const [clientHours, clientMinutes] = clientTime.split(':').map(Number);
    const clientTotalMinutes = clientHours * 60 + clientMinutes;


    // Logic for ABSENT (based on client time)
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
    
    // Location Validation (No AI)
    const distance = calculateDistance(latitude, longitude, schoolLatitude, schoolLongitude);
    
    let isFraudulent = false;
    let fraudReason = '';

    if (distance > schoolRadius) {
        isFraudulent = true;
        fraudReason = `Anda berada ${Math.round(distance)} meter dari lokasi sekolah, yang berada di luar radius ${schoolRadius} meter yang diizinkan.`;
    }
    
    // Determine status based on time (using client time)
    const finalStatus = clientTotalMinutes > checkInEndTotalMinutes ? "Terlambat" : "Hadir";

    // Save attendance record to Firestore, storing the data URI directly
    const attendanceRecord = {
      userId,
      name: userName,
      role: userRole,
      checkInTime: now, // The official timestamp is always the server's UTC time
      checkInLocation: { latitude, longitude },
      checkInPhotoUrl: photoDataUri, // Store the base64 data URI
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

export async function handleCheckout(formData: FormData): Promise<CheckoutState> {
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

export async function updateAttendanceSettings(formData: FormData): Promise<SettingsState> {
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
  userRole: z.enum(['admin', 'guru']),
  photoDataUri: z.string().startsWith('data:image/'),
});

export type AvatarUpdateState = {
    success?: boolean;
    error?: string;
    newAvatarUrl?: string;
};

export async function updateAvatar(formData: FormData): Promise<AvatarUpdateState> {
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
        let collectionName = '';
        if (userRole === 'guru') {
            collectionName = 'teachers';
        } else if (userRole === 'admin') {
            collectionName = 'admin';
        } else {
             return { error: 'Peran pengguna tidak valid.' };
        }

        const userDocRef = doc(db, collectionName, userId);

        // Use setDoc with merge:true to create the document if it doesn't exist, or update it if it does.
        await setDoc(userDocRef, {
            avatar: photoDataUri,
        }, { merge: true });

        // The new "URL" is the data URI itself
        return { success: true, newAvatarUrl: photoDataUri };

    } catch (e) {
        console.error('An error occurred during avatar update:', e);
        const errorMessage = e instanceof Error ? e.message : "Terjadi kesalahan yang tidak terduga.";
        return { error: `Kesalahan server: ${errorMessage}.` };
    }
}

const updateAttendanceSchema = z.object({
  attendanceId: z.string().min(1, "ID Kehadiran diperlukan."),
  checkInTime: z.string().min(1, "Waktu absen masuk diperlukan."),
  checkOutTime: z.string().optional(),
  status: z.enum(['Hadir', 'Terlambat', 'Tidak Hadir']),
  removeFraudWarning: z.preprocess((val) => val === 'on', z.boolean()),
});

export type AttendanceUpdateState = {
  success?: boolean;
  error?: string;
};

export async function updateAttendanceRecord(formData: FormData): Promise<AttendanceUpdateState> {
  const validatedFields = updateAttendanceSchema.safeParse({
    attendanceId: formData.get("attendanceId"),
    checkInTime: formData.get("checkInTime"),
    checkOutTime: formData.get("checkOutTime"),
    status: formData.get("status"),
    removeFraudWarning: formData.get("removeFraudWarning"),
  });

  if (!validatedFields.success) {
    console.error("Validation Error:", validatedFields.error.flatten().fieldErrors);
    return { error: "Data masukan tidak valid." };
  }

  const { attendanceId, checkInTime, checkOutTime, status, removeFraudWarning } = validatedFields.data;
  
  try {
    const recordRef = doc(db, "photo_attendances", attendanceId);

    const updateData: any = {
      status,
      checkInTime: Timestamp.fromDate(new Date(checkInTime)),
    };

    if (checkOutTime && checkOutTime.length > 0) {
      updateData.checkOutTime = Timestamp.fromDate(new Date(checkOutTime));
    } else {
      updateData.checkOutTime = deleteField();
    }

    if (removeFraudWarning) {
      updateData.isFraudulent = false;
      updateData.fraudReason = '';
    }

    await updateDoc(recordRef, updateData);
    return { success: true };

  } catch (e) {
    console.error('Error updating attendance record:', e);
    const errorMessage = e instanceof Error ? e.message : "Terjadi kesalahan yang tidak terduga.";
    return { error: `Kesalahan server: ${errorMessage}.` };
  }
}

const createUserSchema = z.object({
  name: z.string().min(3, "Nama harus memiliki setidaknya 3 karakter."),
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(6, "Kata sandi harus memiliki setidaknya 6 karakter."),
  role: z.enum(['admin', 'guru']),
});

export type CreateUserState = {
    success?: boolean;
    error?: string;
};

export async function createUser(formData: FormData): Promise<CreateUserState> {
    const validatedFields = createUserSchema.safeParse(Object.fromEntries(formData));

    if (!validatedFields.success) {
        const errors = validatedFields.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { error: firstError || "Data masukan tidak valid." };
    }

    const { name, email, password, role } = validatedFields.data;

    try {
        const getAdminApp = () => {
            if (getApps().length > 0 && getApps().some(app => app.name === 'firebase-admin')) {
                return getApp('firebase-admin');
            }
            
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
            if (!projectId || !clientEmail || !privateKey) {
                throw new Error("Variabel lingkungan Firebase Admin (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) tidak diatur.");
            }
        
            return initializeApp({
                credential: {
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                },
                databaseURL: `https://${projectId}.firebaseio.com`,
            }, 'firebase-admin');
        }

        const adminApp = getAdminApp();
        const auth = getAuth(adminApp);
        const firestore = getFirestore(adminApp);

        // Create user in Firebase Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
            emailVerified: true,
            disabled: false,
        });

        const collectionName = role === 'admin' ? 'admin' : 'teachers';
        const userDocRef = firestore.collection(collectionName).doc(userRecord.uid);

        await userDocRef.set({
            name,
            email,
            role,
            avatar: `https://placehold.co/100x100.png?text=${name.charAt(0)}`,
        });

        return { success: true };
    } catch (e: any) {
        console.error('Error creating user:', e);
        let errorMessage = "Terjadi kesalahan yang tidak terduga.";
        if (e.code === 'auth/email-already-exists') {
            errorMessage = 'Email ini sudah digunakan oleh pengguna lain.';
        } else if (e.message) {
            errorMessage = e.message;
        }
        return { error: `Gagal membuat pengguna: ${errorMessage}` };
    }
}
