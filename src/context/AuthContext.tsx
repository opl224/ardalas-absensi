
'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUser(user);
                
                // Fetch base user data from 'users' collection to determine the role
                const userDocRef = doc(db, 'users', user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    
                    if (userData.role === 'guru') {
                        // If the user is a teacher, fetch their detailed profile from the 'teachers' collection
                        const teacherDocRef = doc(db, 'teachers', user.uid);
                        const teacherDocSnap = await getDoc(teacherDocRef);
                        
                        if (teacherDocSnap.exists()) {
                            // Use teacher-specific data, but ensure the role is set correctly from the 'users' doc.
                            setUserProfile({ uid: user.uid, ...teacherDocSnap.data(), role: 'guru' } as UserProfile);
                        } else {
                            console.warn(`Teacher profile for user ${user.uid} not found in 'teachers' collection. Falling back to basic data from 'users' collection.`);
                            // Fallback to the user data from 'users' collection if the teacher profile is missing.
                            // This allows the user to still log in, though with possibly incomplete data.
                            setUserProfile({ uid: user.uid, ...userData } as UserProfile);
                        }
                    } else {
                        // For admins and students, use the data from the 'users' collection
                        setUserProfile({ uid: user.uid, ...userData } as UserProfile);
                    }
                } else {
                    console.error(`User document for user ${user.uid} not found in 'users' collection.`);
                    setUserProfile(null);
                    router.push('/');
                }
            } else {
                setUser(null);
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    const logout = async () => {
        await signOut(auth);
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
