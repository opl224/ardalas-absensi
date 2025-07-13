
'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const logout = useCallback(async (message?: string) => {
        if (message) {
            sessionStorage.setItem('logoutMessage', message);
        } else {
            sessionStorage.removeItem('logoutMessage');
        }
        await signOut(auth);
        setUser(null);
        setUserProfile(null);
        router.push('/');
    }, [router]);

    const handleIdle = useCallback(() => {
        if (auth.currentUser) {
            logout("Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan masuk kembali.");
        }
    }, [logout]);

    useIdleTimer(handleIdle, 1000 * 60 * 60); // 1 hour

    useEffect(() => {
        let profileListenerUnsubscribe: (() => void) | undefined;

        const authStateUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (profileListenerUnsubscribe) {
                profileListenerUnsubscribe();
            }

            if (firebaseUser) {
                setLoading(true);
                setUser(firebaseUser);
                let profileDocRef;
                let userRole: 'admin' | 'guru' | null = null;

                // 1. Check for admin in 'admin' collection
                const adminDocRef = doc(db, 'admin', firebaseUser.uid);
                const adminSnap = await getDoc(adminDocRef);

                if (adminSnap.exists() && adminSnap.data()?.role === 'admin') {
                    userRole = 'admin';
                    profileDocRef = adminDocRef;
                } else {
                    // 2. If not admin, check for teacher in 'teachers' collection
                    const teacherDocRef = doc(db, 'teachers', firebaseUser.uid);
                    const teacherSnap = await getDoc(teacherDocRef);
                    if (teacherSnap.exists()) {
                        userRole = 'guru';
                        profileDocRef = teacherDocRef;
                    }
                }
                
                // 3. If user exists in a collection, set up listener. Otherwise, log out.
                if (userRole && profileDocRef) {
                    profileListenerUnsubscribe = onSnapshot(profileDocRef, (profileSnap) => {
                        if (profileSnap.exists()) {
                            const profileData = profileSnap.data();
                            const finalProfileData: UserProfile = {
                                uid: firebaseUser.uid,
                                email: firebaseUser.email || profileData.email,
                                name: profileData.name || firebaseUser.displayName || 'Pengguna',
                                role: userRole,
                                ...profileData,
                            };
                            setUserProfile(finalProfileData);
                        } else {
                             logout("Sesi Anda tidak valid. Profil tidak ditemukan.");
                        }
                        setLoading(false);
                    }, (error) => {
                        console.error("Error listening to user profile:", error);
                        logout("Gagal memuat profil pengguna.");
                        setLoading(false);
                    });
                } else {
                    console.error(`User document for user ${firebaseUser.uid} not found in 'admin' or 'teachers'.`);
                    logout("Profil pengguna tidak ditemukan di basis data.");
                    setLoading(false);
                }

            } else {
                setUser(null);
                setUserProfile(null);
                setLoading(false);
            }
        });

        return () => {
            authStateUnsubscribe();
            if (profileListenerUnsubscribe) {
                profileListenerUnsubscribe();
            }
        };
    }, [logout]);

    if (loading) {
        return <CenteredLoader />;
    }

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
