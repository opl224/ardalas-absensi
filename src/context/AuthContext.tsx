
'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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

const publicRoutes = ['/'];

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

    useIdleTimer(handleIdle, 1000 * 60 * 60);

    useEffect(() => {
        const authStateUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                if (userProfile && userProfile.uid === firebaseUser.uid) {
                    setLoading(false);
                    return;
                }
                
                setLoading(true);
                setUser(firebaseUser);

                // Check the central 'users' collection first for the role.
                const userRoleRef = doc(db, 'users', firebaseUser.uid);
                const userRoleSnap = await getDoc(userRoleRef);

                if (userRoleSnap.exists()) {
                    const { role } = userRoleSnap.data();
                    const collectionName = role === 'admin' ? 'admin' : 'teachers';

                    const profileDocRef = doc(db, collectionName, firebaseUser.uid);
                    const profileSnap = await getDoc(profileDocRef);

                    if (profileSnap.exists()) {
                        setUserProfile({ uid: firebaseUser.uid, ...profileSnap.data() } as UserProfile);
                    } else {
                         console.error(`User document for ${firebaseUser.uid} not found in '${collectionName}' collection.`);
                         logout("Detail profil pengguna tidak ditemukan.");
                    }
                } else {
                    console.error(`User role for ${firebaseUser.uid} not found in 'users' collection.`);
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

    useEffect(() => {
        if (loading) return; 

        const isPublic = publicRoutes.includes(pathname);

        if (!userProfile && !isPublic) {
            logout();
        } else if (userProfile && isPublic) {
            const targetPath = userProfile.role === 'admin' ? '/admin/dashboard' : '/teacher/dashboard';
            router.replace(targetPath);
        } else if (userProfile && userProfile.role === 'guru' && pathname.startsWith('/admin')) {
            router.replace('/teacher/dashboard');
        } else if (userProfile && userProfile.role === 'admin' && pathname.startsWith('/teacher')) {
            router.replace('/admin/dashboard');
        }

    }, [userProfile, loading, pathname, router, logout]);

    if (loading) {
        return <CenteredLoader />;
    }

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, logout, setUserProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

    