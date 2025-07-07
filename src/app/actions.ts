'use server'

import { validateAttendance, ValidateAttendanceInput } from "@/ai/flows/attendance-validator";
import { z } from "zod";

const checkinSchema = z.object({
  photoDataUri: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export type CheckinState = {
  isFraudulent?: boolean;
  reason?: string;
  error?: string;
  success?: boolean;
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
    });

    if (!validatedFields.success) {
        console.error("Validation Error:", validatedFields.error.flatten().fieldErrors);
      return { error: "Data masukan tidak valid. Silakan coba lagi." };
    }

    const { photoDataUri, latitude, longitude } = validatedFields.data;

    if (!photoDataUri.startsWith('data:image/')) {
        return { error: 'Data gambar tidak valid. Silakan ambil ulang foto selfie Anda.' };
    }

    const aiInput: ValidateAttendanceInput = {
      photoDataUri,
      latitude,
      longitude,
      expectedLocation: {
        latitude: -6.2088,
        longitude: 106.8456,
        radius: 500,
      },
    };

    const result = await validateAttendance(aiInput);

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
        // In a real app, you would save the checkout time for the user in a database.
        console.log("User is checking out.");
        return { success: true };
    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "Terjadi kesalahan yang tidak terduga.";
        return { error: `Kesalahan server: ${errorMessage} Silakan coba lagi.` };
    }
}
