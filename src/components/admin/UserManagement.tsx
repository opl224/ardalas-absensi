'use client'

import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Download, FilePen, Trash2 } from 'lucide-react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LottieLoader } from '../ui/lottie-loader';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Guru' | 'Siswa' | 'Admin';
  status: 'Hadir' | 'Terlambat' | 'Absen' | 'Penipuan'; // This might need to be fetched separately
  avatar: string;
}

const USERS_PER_PAGE = 10;

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersQuery = query(collection(db, 'users'));
        const querySnapshot = await getDocs(usersQuery);
        const fetchedUsers = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Placeholder for status, as it's dynamic
          status: 'Absen' 
        })) as User[];
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
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

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 p-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-foreground">Manajemen Pengguna</h1>
        <div className="flex items-center gap-2 mt-2">
            <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Unduh
            </Button>
            <Button className="ml-auto">Tambah Pengguna</Button>
        </div>
      </header>

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
                    <Badge variant={user.status === 'Absen' ? 'destructive' : 'warning'}>
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
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-muted-foreground">
                Halaman {currentPage} dari {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Berikutnya
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
