
'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { CenteredLoader } from '@/components/ui/loader';
import useIdleTimer from '@/hooks/useIdleTimer';

export interface UserProfile {
    uid: string;
    email: string;
    name: string;
    role: 'admin' | 'guru';
    avatar?: string;
    subject?: string;
    class?: string;
    gender?: string;
    phone?: string;
    religion?: string;
    address?: string;
    nip?: string;
}

export interface AuthContextType {
    user: FirebaseUser | null;
    userProfile: UserProfile | null;
    loading: boolean;
    logout: (message?: string) => void;
    setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicRoutes = ['/']; // The login page is the only public route

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const logout = useCallback(async (message?: string) => {
        if (message) {
            sessionStorage.setItem('logoutMessage', message);
        } else {
            sessionStorage.removeItem('logoutMessage');
        }
        await signOut(auth);
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        if (pathname !== '/') {
          router.replace('/');
        }
    }, [router, pathname]);

    const handleIdle = useCallback(() => {
        if (auth.currentUser) {
            logout("Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan masuk kembali.");
        }
    }, [logout]);

    useIdleTimer(handleIdle, 1000 * 60 * 60); // 1 hour

    useEffect(() => {
        const authStateUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                if (userProfile && userProfile.uid === firebaseUser.uid) {
                    setLoading(false);
                    return;
                }

                setLoading(true);
                setUser(firebaseUser);

                let profile: UserProfile | null = null;
                
                // Check teacher collection first
                const teacherDocRef = doc(db, 'teachers', firebaseUser.uid);
                const teacherSnap = await getDoc(teacherDocRef);
                if (teacherSnap.exists()) {
                    profile = { uid: firebaseUser.uid, role: 'guru', ...teacherSnap.data() } as UserProfile;
                } else {
                    // If not a teacher, check admin collection
                    const adminDocRef = doc(db, 'admin', firebaseUser.uid);
                    const adminSnap = await getDoc(adminDocRef);
                    if (adminSnap.exists()) {
                        profile = { uid: firebaseUser.uid, role: 'admin', ...adminSnap.data() } as UserProfile;
                    }
                }

                if (profile) {
                    setUserProfile(profile);
                } else {
                    console.error(`User document for ${firebaseUser.uid} not found in any collection.`);
                    logout("Profil pengguna Anda tidak ditemukan di basis data.");
                }
            } else {
                setUser(null);
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => {
            authStateUnsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    // This effect handles route protection
    useEffect(() => {
        if (loading) return; // Don't do anything while loading

        const isPublic = publicRoutes.includes(pathname);

        if (!userProfile && !isPublic) {
            // If not logged in and trying to access a protected route, redirect to login
            logout();
        } else if (userProfile && isPublic) {
            // If logged in and on a public route (like login page), redirect to their dashboard
            const targetPath = userProfile.role === 'admin' ? '/admin/dashboard' : '/teacher/dashboard';
            router.replace(targetPath);
        } else if (userProfile && userProfile.role === 'guru' && pathname.startsWith('/admin')) {
            // If a teacher tries to access an admin route, redirect them
            router.replace('/teacher/dashboard');
        } else if (userProfile && userProfile.role === 'admin' && pathname.startsWith('/teacher')) {
            // If an admin tries to access a teacher route, redirect them
            router.replace('/admin/dashboard');
        }

    }, [userProfile, loading, pathname, router, logout]);

    // Show a loader while authentication is in progress or a redirect is imminent
    if (loading) {
        return <CenteredLoader />;
    }

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, logout, setUserProfile }}>
            {children}
        </AuthContext.Provider>
    );
};
