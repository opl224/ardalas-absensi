'use server';

/**
 * @fileOverview An attendance validator AI agent.
 *
 * - validateAttendance - A function that handles the attendance validation process.
 * - ValidateAttendanceInput - The input type for the validateAttendance function.
 * - ValidateAttendanceOutput - The return type for the validateAttendance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateAttendanceInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A selfie photo of the person checking in, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  latitude: z.number().describe('The latitude of the location where the person is checking in.'),
  longitude: z.number().describe('The longitude of the location where the person is checking in.'),
  expectedLocation: z.object({
    latitude: z.number().describe('The expected latitude of the school.'),
    longitude: z.number().describe('The expected longitude of the school.'),
    radius: z.number().describe('The acceptable radius (in meters) from the school.'),
  }).describe('The expected location of the school.'),
});
export type ValidateAttendanceInput = z.infer<typeof ValidateAttendanceInputSchema>;

const ValidateAttendanceOutputSchema = z.object({
  isFraudulent: z.boolean().describe('Whether or not the attendance check-in is potentially fraudulent.'),
  reason: z.string().describe('The reason why the attendance check-in is potentially fraudulent.'),
});
export type ValidateAttendanceOutput = z.infer<typeof ValidateAttendanceOutputSchema>;

export async function validateAttendance(input: ValidateAttendanceInput): Promise<ValidateAttendanceOutput> {
  return validateAttendanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'validateAttendancePrompt',
  input: {schema: ValidateAttendanceInputSchema},
  output: {schema: ValidateAttendanceOutputSchema},
  prompt: `You are an expert attendance validator specializing in detecting attendance fraud.

You will use the provided information to determine if the attendance check-in is potentially fraudulent. Consider factors such as the person's location compared to the expected school location, and whether the selfie matches the expected person.

Latitude: {{{latitude}}}
Longitude: {{{longitude}}}

Expected School Location:
Latitude: {{{expectedLocation.latitude}}}
Longitude: {{{expectedLocation.longitude}}}
Radius: {{{expectedLocation.radius}}} meters

Selfie Photo: {{media url=photoDataUri}}

Based on this information, determine if the attendance check-in is potentially fraudulent, and provide a reason for your determination.  Set the isFraudulent output field appropriately.
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
