
'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { CenteredLoader } from '@/components/ui/loader';

export interface UserProfile {
    uid: string;
    email: string;
    name: string;
    role: 'admin' | 'guru' | 'siswa';
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
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let profileListenerUnsubscribe: (() => void) | undefined;

        const authStateUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            // Clean up old listener when user auth state changes
            if (profileListenerUnsubscribe) {
                profileListenerUnsubscribe();
            }

            if (firebaseUser) {
                setUser(firebaseUser);

                // First, determine the role with a one-time fetch.
                const baseUserDocRef = doc(db, 'users', firebaseUser.uid);
                const baseUserSnap = await getDoc(baseUserDocRef);

                if (!baseUserSnap.exists()) {
                    console.error(`User document for user ${firebaseUser.uid} not found in 'users' collection.`);
                    setUser(null);
                    setUserProfile(null);
                    setLoading(false);
                    return;
                }
                
                const baseUserData = baseUserSnap.data();
                const userRole = baseUserData.role;

                // Now, set up a real-time listener on the correct collection based on the role.
                const profileDocRef = userRole === 'guru' 
                    ? doc(db, 'teachers', firebaseUser.uid) 
                    : baseUserDocRef;

                profileListenerUnsubscribe = onSnapshot(profileDocRef, (profileSnap) => {
                    if (profileSnap.exists()) {
                        // Combine data and ensure the role from 'users' is the source of truth.
                        setUserProfile({
                            uid: firebaseUser.uid,
                            ...profileSnap.data(),
                            role: userRole, 
                        } as UserProfile);
                    } else {
                        // Fallback if the specific profile (e.g., 'teachers' doc) doesn't exist.
                        console.warn(`Profile document for user ${firebaseUser.uid} not found in its specific collection. Falling back to base data.`);
                        setUserProfile({ uid: firebaseUser.uid, ...baseUserData } as UserProfile);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error listening to user profile:", error);
                    setUserProfile(null);
                    setLoading(false);
                });

            } else {
                setUser(null);
                setUserProfile(null);
                setLoading(false);
            }
        });

        // Cleanup on unmount
        return () => {
            authStateUnsubscribe();
            if (profileListenerUnsubscribe) {
                profileListenerUnsubscribe();
            }
        };
    }, []); // Empty dependency array ensures this runs only once.

    const logout = async () => {
        await signOut(auth);
        // The onAuthStateChanged listener will handle state cleanup.
        router.push('/');
    };

    if (loading) {
        return <CenteredLoader />;
    }

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
