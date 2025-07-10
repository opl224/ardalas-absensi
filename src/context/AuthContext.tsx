
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
                // First, try to find user in 'users' (admins)
                let userDocRef = doc(db, 'users', firebaseUser.uid);
                let userSnap = await getDoc(userDocRef);
                let userData = userSnap.data();
                let userRole = userData?.role;
                let profileDocRef = userDocRef;

                // If not in 'users', check 'teachers'
                if (!userSnap.exists()) {
                    profileDocRef = doc(db, 'teachers', firebaseUser.uid);
                    userSnap = await getDoc(profileDocRef);
                    if (userSnap.exists()) {
                       // Teacher specific data + base data from auth
                       userData = { ...userSnap.data(), email: firebaseUser.email, name: userSnap.data()?.name || firebaseUser.displayName };
                       userRole = 'guru';
                    } else {
                       console.error(`User document for user ${firebaseUser.uid} not found.`);
                       logout("Profil pengguna tidak ditemukan.");
                       return;
                    }
                }

                setUser(firebaseUser);
                
                profileListenerUnsubscribe = onSnapshot(profileDocRef, (profileSnap) => {
                    const profileData = profileSnap.exists() ? profileSnap.data() : {};
                    const finalProfileData = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        ...profileData, // Contains name, avatar, etc.
                        role: userRole,
                    };
                    setUserProfile(finalProfileData as UserProfile);
                    setLoading(false);
                }, (error) => {
                    console.error("Error listening to user profile:", error);
                    logout("Gagal memuat profil pengguna.");
                });
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
