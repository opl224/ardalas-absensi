import Link from 'next/link';
import { GraduationCap, Briefcase, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="items-center text-center">
            <Logo />
            <CardTitle className="font-headline pt-4 text-3xl">Welcome to SchoolTrack</CardTitle>
            <CardDescription>Select your role to sign in</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button asChild size="lg" className="w-full">
              <Link href="/student/dashboard">
                <GraduationCap className="mr-2 h-5 w-5" />
                Sign in as Student
              </Link>
            </Button>
            <Button asChild size="lg" className="w-full">
              <Link href="/teacher/dashboard">
                <Briefcase className="mr-2 h-5 w-5" />
                Sign in as Teacher
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full">
              <Link href="/admin/dashboard">
                <Shield className="mr-2 h-5 w-5" />
                Sign in as Admin
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
