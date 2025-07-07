'use client'

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Download, Filter, FilePen, Trash2 } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
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

type FilterType = 'Semua' | 'Admin' | 'Guru' | 'Siswa';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('Semua');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        let usersQuery;
        if (activeFilter === 'Semua') {
          usersQuery = query(collection(db, 'users'));
        } else {
          // Firestore roles are lowercase, UI is capitalized
          usersQuery = query(collection(db, 'users'), where('role', '==', activeFilter.toLowerCase()));
        }
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
  }, [activeFilter]);

  const filteredUsers = users.filter(user => {
    return user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 p-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-foreground">Manajemen Pengguna</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="bg-card">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="bg-card">
            <Filter className="h-4 w-4" />
          </Button>
          <Button>Tambah Pengguna</Button>
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

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {(['Semua', 'Guru', 'Siswa', 'Admin'] as FilterType[]).map(filter => (
          <Button
            key={filter}
            variant={activeFilter === filter ? 'default' : 'outline'}
            className={`rounded-full px-4 py-1 h-auto text-sm shrink-0 ${activeFilter !== filter ? 'bg-white' : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
            <LottieLoader size={80} />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
