'use server';

/**
 * @fileOverview Agen AI validator kehadiran.
 *
 * - validateAttendance - Fungsi yang menangani proses validasi kehadiran.
 * - ValidateAttendanceInput - Tipe masukan untuk fungsi validateAttendance.
 * - ValidateAttendanceOutput - Tipe kembalian untuk fungsi validateAttendance.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateAttendanceInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Foto selfie orang yang melakukan check-in, sebagai URI data yang harus menyertakan tipe MIME dan menggunakan enkode Base64. Format yang diharapkan: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  latitude: z.number().describe('Garis lintang dari lokasi tempat orang tersebut check-in.'),
  longitude: z.number().describe('Garis bujur dari lokasi tempat orang tersebut check-in.'),
  expectedLocation: z.object({
    latitude: z.number().describe('Garis lintang sekolah yang diharapkan.'),
    longitude: z.number().describe('Garis bujur sekolah yang diharapkan.'),
    radius: z.number().describe('Radius yang dapat diterima (dalam meter) dari sekolah.'),
  }).describe('Lokasi sekolah yang diharapkan.'),
});
export type ValidateAttendanceInput = z.infer<typeof ValidateAttendanceInputSchema>;

const ValidateAttendanceOutputSchema = z.object({
  isFraudulent: z.boolean().describe('Apakah check-in kehadiran berpotensi curang atau tidak.'),
  reason: z.string().describe('Alasan mengapa check-in kehadiran berpotensi curang.'),
});
export type ValidateAttendanceOutput = z.infer<typeof ValidateAttendanceOutputSchema>;

export async function validateAttendance(input: ValidateAttendanceInput): Promise<ValidateAttendanceOutput> {
  return validateAttendanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'validateAttendancePrompt',
  input: {schema: ValidateAttendanceInputSchema},
  output: {schema: ValidateAttendanceOutputSchema},
  prompt: `Anda adalah seorang ahli validator kehadiran yang berspesialisasi dalam mendeteksi kecurangan absensi.

Anda akan menggunakan informasi yang diberikan untuk menentukan apakah check-in kehadiran berpotensi curang. Pertimbangkan faktor-faktor seperti lokasi orang tersebut dibandingkan dengan lokasi sekolah yang diharapkan, dan apakah foto selfie cocok dengan orang yang diharapkan.

Lintang: {{{latitude}}}
Bujur: {{{longitude}}}

Lokasi Sekolah yang Diharapkan:
Lintang: {{{expectedLocation.latitude}}}
Bujur: {{{expectedLocation.longitude}}}
Radius: {{{expectedLocation.radius}}} meter

Foto Selfie: {{media url=photoDataUri}}

Berdasarkan informasi ini, tentukan apakah check-in kehadiran berpotensi curang, dan berikan alasan untuk penentuan Anda. Atur bidang keluaran isFraudulent dengan tepat.
`,
});

const validateAttendanceFlow = ai.defineFlow(
  {
    name: 'validateAttendanceFlow',
    inputSchema: ValidateAttendanceInputSchema,
    outputSchema: ValidateAttendanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
