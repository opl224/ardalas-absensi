
'use server';

import { z } from "zod";
import { doc, setDoc, collection, updateDoc, getDoc, Timestamp, deleteField, where, query, getDocs, limit, deleteDoc } from "firebase/firestore"; 
import { db } from "@/lib/firebase";
import { getAuth, updatePassword as adminUpdatePassword, deleteUser as adminDeleteUser } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";

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
    const now = new Date(); 

    const settingsRef = doc(db, "settings", "attendance");
    const settingsDoc = await getDoc(settingsRef);
    if (!settingsDoc.exists()) {
        return { error: "Pengaturan absensi belum dikonfigurasi. Silakan hubungi admin." };
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
    const recordSnap = await getDoc(recordRef);

    if (!recordSnap.exists()) {
      return { error: "Catatan kehadiran tidak ditemukan." };
    }
    const originalData = recordSnap.data();
    const originalCheckInTime = originalData.checkInTime as Timestamp;

    const newCheckInDate = new Date(checkInTime);
    
    const updateData: any = {
      status,
    };

    // Only update checkInTime if it has actually changed to preserve original timestamp precision
    if (originalCheckInTime.toMillis() !== newCheckInDate.getTime()) {
      updateData.checkInTime = Timestamp.fromDate(newCheckInDate);
    }

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

export type DeleteState = {
    success?: boolean;
    error?: string;
};

export async function deleteAttendanceRecord(attendanceId: string): Promise<DeleteState> {
    if (!attendanceId) {
        return { error: "ID Kehadiran diperlukan." };
    }

    try {
        const recordRef = doc(db, "photo_attendances", attendanceId);
        await deleteDoc(recordRef);
        return { success: true };
    } catch (e) {
        console.error('Error deleting attendance record:', e);
        const errorMessage = e instanceof Error ? e.message : "Terjadi kesalahan yang tidak terduga.";
        return { error: `Kesalahan server: ${errorMessage}.` };
    }
}


const createUserSchema = z.object({
  uid: z.string().min(1, "UID diperlukan."),
  name: z.string().min(3, "Nama harus memiliki setidaknya 3 karakter."),
  email: z.string().email("Format email tidak valid."),
  role: z.enum(['admin', 'guru'], { required_error: "Peran harus dipilih." }),
});

export type CreateUserState = {
    success?: boolean;
    error?: string;
    userData?: z.infer<typeof createUserSchema>;
};

export async function saveUserToFirestore(data: z.infer<typeof createUserSchema>): Promise<CreateUserState> {
    const validatedFields = createUserSchema.safeParse(data);

    if (!validatedFields.success) {
        const errors = validatedFields.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0] ?? "Data masukan tidak valid.";
        return { error: firstError };
    }

    const { uid, email, name, role } = validatedFields.data;

    try {
        const collectionName = role === 'admin' ? 'admin' : 'teachers';
        const userDocRef = doc(db, collectionName, uid);
        
        const userData = {
            name,
            email,
            role,
            uid,
        };

        await setDoc(userDocRef, userData, { merge: true });

        return { success: true, userData: validatedFields.data };

    } catch (error: any) {
        console.error("Error saving user to Firestore:", error);
        return { error: 'Terjadi kesalahan saat menyimpan data pengguna.' };
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

        const teachersQuery = query(collection(db, "teachers"));
        const teachersSnapshot = await getDocs(teachersQuery);
        const allTeachers = new Map(teachersSnapshot.docs.map(doc => [doc.id, doc.data()]));

        if (allTeachers.size === 0) {
            return { success: true, message: "Tidak ada data guru yang ditemukan untuk diproses." };
        }

        const attendanceQuery = query(
            collection(db, "photo_attendances"),
            where("checkInTime", ">=", startOfToday),
            where("checkInTime", "<", endOfToday)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const presentUserIds = new Set(attendanceSnapshot.docs.map(doc => doc.data().userId));

        let absentTeachersMarked = 0;
        for (const [teacherId, teacherData] of allTeachers.entries()) {
            if (!presentUserIds.has(teacherId)) {
                const absentRecord = {
                    userId: teacherId,
                    name: teacherData.name,
                    role: teacherData.role || 'guru',
                    checkInTime: new Date(), 
                    checkInLocation: null,
                    checkInPhotoUrl: null,
                    isFraudulent: false,
                    fraudReason: '',
                    status: "Tidak Hadir",
                };

                const absentDocId = `absent-${today.toISOString().slice(0, 10)}-${teacherId}`;
                const attendanceRef = doc(db, "photo_attendances", absentDocId);

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
        return { error: `Kesalahan server: ${errorMessage}.` };
    }
}

const updateUserSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['Admin', 'Guru']),
  // Personal
  nip: z.string().optional(),
  gender: z.enum(['Laki-laki', 'Perempuan', '']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  // Academic
  subject: z.string().optional(),
  class: z.string().optional(),
  // Admin
  name: z.string().min(3, "Nama harus memiliki setidaknya 3 karakter."),
  password: z.string().optional(),
});

export type UpdateUserState = {
    success?: boolean;
    error?: string;
};

export async function updateUser(formData: FormData): Promise<UpdateUserState> {
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = updateUserSchema.safeParse(rawData);
  
  if (!validatedFields.success) {
    console.error("Validation Error:", validatedFields.error.flatten().fieldErrors);
    return { error: "Data masukan tidak valid." };
  }

  const { userId, role, name, password, ...otherData } = validatedFields.data;

  try {
    const firestoreData: {[key: string]: any} = { name };
    // Filter out empty strings from otherData so they don't overwrite existing fields with blanks
    for (const [key, value] of Object.entries(otherData)) {
      if (value !== '' && value !== undefined) {
        firestoreData[key] = value;
      }
    }
    
    // Update password if provided
    if (password && password.length >= 6) {
        getAdminApp(); // Ensure admin app is initialized
        await getAuth().updateUser(userId, { password });
    }

    // Update Firestore
    const collectionName = role === 'Guru' ? 'teachers' : 'admin';
    const userDocRef = doc(db, collectionName, userId);
    await updateDoc(userDocRef, firestoreData);
    
    return { success: true };
  } catch (error: any) {
    console.error("Error updating user:", error);
    let errorMessage = "Terjadi kesalahan saat memperbarui pengguna.";
    if (error.code === 'auth/user-not-found') {
        errorMessage = 'Pengguna tidak ditemukan di Firebase Authentication.';
    } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Kata sandi terlalu lemah. Gunakan setidaknya 6 karakter.';
    } else if (error.message && error.message.includes("Must be a valid phone number")) {
        errorMessage = "Nomor telepon tidak valid.";
    }
    return { error: errorMessage };
  }
}
