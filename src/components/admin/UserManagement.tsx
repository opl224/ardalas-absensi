'use client'

import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Download, FilePen, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LottieLoader } from '../ui/lottie-loader';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Guru' | 'Siswa' | 'Admin';
  status: 'Hadir' | 'Terlambat' | 'Absen' | 'Penipuan';
  avatar: string;
}

const USERS_PER_PAGE = 10;

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchUsersAndStatus = async () => {
      setLoading(true);
      try {
        // 1. Fetch today's attendance records to determine status
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const attendanceQuery = query(
          collection(db, "photo_attendances"),
          where("checkInTime", ">=", todayStart),
          where("checkInTime", "<=", todayEnd)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceStatusMap = new Map<string, string>();
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.userId && data.status) {
                attendanceStatusMap.set(data.userId, data.status);
            }
        });

        // 2. Fetch only teacher users
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'guru'));
        const querySnapshot = await getDocs(usersQuery);

        // 3. Combine user data with today's status
        const fetchedUsers = querySnapshot.docs.map(doc => {
          const userData = doc.data();
          const userId = doc.id;
          // Default to 'Absen' if no attendance record is found for today
          const status = attendanceStatusMap.get(userId) || 'Absen';

          return {
            id: userId,
            ...userData,
            status: status,
          } as User;
        });

        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users and status: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsersAndStatus();
  }, []);

  const filteredUsers = useMemo(() => {
    setCurrentPage(1); // Reset to first page on search
    if (!searchTerm) {
        return users;
    }
    return users.filter(user => {
      return user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
      const startIndex = (currentPage - 1) * USERS_PER_PAGE;
      return filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const paginationRange = useMemo(() => {
    const siblingCount = 1;
    const totalPageNumbers = siblingCount + 5; // siblingCount + first/last + current + 2*ellipsis

    if (totalPageNumbers >= totalPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, '...', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;
      let rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + i + 1);
      return [firstPageIndex, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = [];
        for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
            middleRange.push(i);
        }
      return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
    }
  }, [totalPages, currentPage]);

  return (
    <div className="bg-gray-50 dark:bg-zinc-900">
      <header className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h1 className="text-xl font-bold text-foreground">Manajemen Pengguna</h1>
      </header>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
            <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Unduh
            </Button>
            <Button className="ml-auto">Tambah Pengguna</Button>
        </div>

        <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
            placeholder="Cari pengguna..." 
            className="pl-10 bg-white" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        {loading ? (
            <div className="flex justify-center items-center h-64">
                <LottieLoader size={80} />
            </div>
        ) : (
            <>
            <div className="space-y-3">
                {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((user) => (
                    <Card key={user.id} className="p-3 flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person portrait" />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                        <p className="font-semibold text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground -mt-1">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                        <Badge variant={
                            user.status === 'Hadir' ? 'default' :
                            user.status === 'Terlambat' ? 'secondary' :
                            user.status === 'Penipuan' ? 'destructive' :
                            'outline'
                        }>
                            {user.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground capitalize">{user.role}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200">
                        <FilePen className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 bg-red-100 text-destructive hover:bg-red-200">
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    </Card>
                ))
                ) : (
                    <p className="text-center text-muted-foreground py-8">Tidak ada pengguna yang ditemukan.</p>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-1 mt-6">
                    <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="text-primary"
                    >
                    <ChevronLeft className="h-5 w-5" />
                    </Button>
                    {paginationRange?.map((page, index) =>
                    page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 py-1 text-muted-foreground">
                        ...
                        </span>
                    ) : (
                        <Button
                        key={page}
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentPage(page as number)}
                        className={cn(
                            'h-9 w-9',
                            currentPage === page
                            ? 'font-bold text-primary underline decoration-2 underline-offset-4'
                            : 'text-muted-foreground'
                        )}
                        >
                        {page}
                        </Button>
                    )
                    )}
                    <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="text-primary"
                    >
                    <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            )}
            </>
        )}
      </div>
    </div>
  );
}
