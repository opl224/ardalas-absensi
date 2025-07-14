
'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, limit } from 'firebase/firestore';
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
        router.replace('/'); // Use replace to prevent back navigation
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
                let profileUid: string | null = null;
                
                const teacherDocRef = doc(db, 'teachers', firebaseUser.uid);
                const teacherSnap = await getDoc(teacherDocRef);

                if (teacherSnap.exists()) {
                    userRole = 'guru';
                    profileDocRef = teacherDocRef;
                    profileUid = firebaseUser.uid;
                } else {
                    const adminDocRefByUid = doc(db, 'admin', firebaseUser.uid);
                    const adminSnapByUid = await getDoc(adminDocRefByUid);

                    if (adminSnapByUid.exists()) {
                        userRole = 'admin';
                        profileDocRef = adminDocRefByUid;
                        profileUid = firebaseUser.uid;
                    } else {
                        const adminQuery = query(collection(db, 'admin'), where('email', '==', firebaseUser.email), limit(1));
                        const adminSnapshot = await getDocs(adminQuery);
                        if (!adminSnapshot.empty) {
                            const adminDoc = adminSnapshot.docs[0];
                            userRole = 'admin';
                            profileDocRef = doc(db, 'admin', adminDoc.id);
                            profileUid = adminDoc.id;
                        }
                    }
                }
                
                if (userRole && profileDocRef && profileUid) {
                    profileListenerUnsubscribe = onSnapshot(profileDocRef, (profileSnap) => {
                        if (profileSnap.exists()) {
                            const profileData = profileSnap.data();
                            const finalProfileData: UserProfile = {
                                uid: profileUid!,
                                email: firebaseUser.email || profileData.email,
                                name: profileData.name || firebaseUser.displayName || 'Pengguna',
                                role: userRole!,
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


    // This effect handles route protection
    useEffect(() => {
        if (loading) return; // Don't do anything while loading

        const isPublic = publicRoutes.includes(pathname);

        if (!user && !isPublic) {
            // If not logged in and trying to access a protected route, redirect to login
            logout(); // Use logout to ensure clean state and proper redirection
        } else if (user && isPublic) {
            // If logged in and on a public route (like login page), redirect to their dashboard
            const targetPath = userProfile?.role === 'admin' ? '/admin/dashboard' : '/teacher/dashboard';
            router.replace(targetPath);
        }
    }, [user, userProfile, loading, pathname, router, logout]);

    // Show a loader while authentication is in progress or a redirect is imminent
    const shouldShowLoader = loading || (!publicRoutes.includes(pathname) && !userProfile);
    if (shouldShowLoader) {
        return <CenteredLoader />;
    }

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, logout, setUserProfile }}>
            {children}
        </AuthContext.Provider>
    );
};
