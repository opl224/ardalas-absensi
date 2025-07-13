
'use server';

import { z } from "zod";
import { doc, setDoc, collection, updateDoc, getDoc, Timestamp, deleteField, where, query, getDocs, limit } from "firebase/firestore"; 
import { db } from "@/lib/firebase";
import { getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        throw new Error("Variabel lingkungan Firebase Admin (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) tidak diatur. Harap konfigurasikan file .env Anda.");
    }
    
    if (getApps().some(app => app.name === 'firebase-admin')) {
        return getApp('firebase-admin');
    }

    return initializeApp({
        credential: {
            projectId: serviceAccount.projectId,
            clientEmail: serviceAccount.clientEmail,
            privateKey: serviceAccount.privateKey,
        },
    }, 'firebase-admin');
}


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

    if (!photoDataUri.startsWith('data:image/')) {
        return { error: 'Data gambar tidak valid. Silakan ambil ulang foto selfie Anda.' };
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
      userId,
      name: userName,
      role: userRole,
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

        await setDoc(userDocRef, {
            avatar: photoDataUri,
        }, { merge: true });

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
        const adminApp = getAdminApp();
        const auth = getAuth(adminApp);
        const firestore = getAdminFirestore(adminApp);

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

export type MarkAbsenteesState = {
    success?: boolean;
    error?: string;
    message?: string;
};

export async function markAbsentees(): Promise<MarkAbsenteesState> {
    try {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        // 1. Get all teachers
        const teachersQuery = query(collection(db, "teachers"));
        const teachersSnapshot = await getDocs(teachersQuery);
        const allTeachers = new Map(teachersSnapshot.docs.map(doc => [doc.id, doc.data()]));

        if (allTeachers.size === 0) {
            return { success: true, message: "Tidak ada data guru yang ditemukan untuk diproses." };
        }

        // 2. Get all attendance records for today
        const attendanceQuery = query(
            collection(db, "photo_attendances"),
            where("checkInTime", ">=", startOfToday),
            where("checkInTime", "<", endOfToday)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const presentUserIds = new Set(attendanceSnapshot.docs.map(doc => doc.data().userId));

        // 3. Find teachers who are not in the attendance list
        let absentTeachersMarked = 0;
        for (const [teacherId, teacherData] of allTeachers.entries()) {
            if (!presentUserIds.has(teacherId)) {
                // This teacher is absent, create a record
                const absentRecord = {
                    userId: teacherId,
                    name: teacherData.name,
                    role: teacherData.role || 'guru',
                    checkInTime: new Date(), // Mark as of now
                    checkInLocation: null,
                    checkInPhotoUrl: null,
                    isFraudulent: false,
                    fraudReason: '',
                    status: "Tidak Hadir",
                };

                // Use a combination of a static prefix and the user ID to ensure a unique doc ID for today
                const absentDocId = `absent-${today.toISOString().slice(0, 10)}-${teacherId}`;
                const attendanceRef = doc(db, "photo_attendances", absentDocId);

                // Use setDoc to avoid creating duplicate absent records if the function is run multiple times
                await setDoc(attendanceRef, absentRecord);
                absentTeachersMarked++;
            }
        }

        if (absentTeachersMarked === 0) {
            return { success: true, message: "Semua guru telah melakukan absensi atau sudah ditandai tidak hadir." };
        }

        return { success: true, message: `${absentTeachersMarked} guru telah ditandai sebagai Tidak Hadir.` };

    } catch (e) {
        console.error("Error marking absentees: ", e);
        const errorMessage = e instanceof Error ? e.message : "Terjadi kesalahan yang tidak terduga.";
        return { error: `Kesalahan server: ${errorMessage}` };
    }
}
