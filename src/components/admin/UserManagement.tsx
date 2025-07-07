'use client'

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Download, Filter, FilePen, Trash2 } from 'lucide-react';

const users = [
  {
    name: 'John Smith',
    email: 'john.smith@school.edu',
    role: 'Teacher',
    status: 'Late',
    avatar: 'https://placehold.co/100x100.png',
    dataAiHint: 'man portrait'
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@school.edu',
    role: 'Teacher',
    status: 'Late',
    avatar: 'https://placehold.co/100x100.png',
    dataAiHint: 'woman portrait'
  },
  {
    name: 'Michael Brown',
    email: 'michael.brown@school.edu',
    role: 'Student',
    status: 'Absent',
    avatar: 'https://placehold.co/100x100.png',
    dataAiHint: 'man portrait'
  },
  {
    name: 'Emily Davis',
    email: 'emily.davis@school.edu',
    role: 'Student',
    status: 'Absent',
    avatar: 'https://placehold.co/100x100.png',
    dataAiHint: 'woman portrait'
  },
  {
    name: 'David Wilson',
    email: 'david.wilson@school.edu',
    role: 'Student',
    status: 'Absent',
    avatar: 'https://placehold.co/100x100.png',
    dataAiHint: 'man portrait'
  },
];

type FilterType = 'All' | 'Admin' | 'Teacher' | 'Student';

export function UserManagement() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user => {
    const matchesFilter = activeFilter === 'All' || user.role === activeFilter;
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 p-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-foreground">User Management</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="bg-card">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="bg-card">
            <Filter className="h-4 w-4" />
          </Button>
          <Button>Add User</Button>
        </div>
      </header>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Search users..." 
          className="pl-10 bg-white" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {(['All', 'Admin', 'Teacher', 'Student'] as FilterType[]).map(filter => (
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

      <div className="space-y-3">
        {filteredUsers.map((user, index) => (
          <Card key={index} className="p-3 flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar} alt={user.name} data-ai-hint={user.dataAiHint} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <p className="font-semibold text-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground -mt-1">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={user.status === 'Absent' ? 'destructive' : 'warning'}>
                  {user.status}
                </Badge>
                <span className="text-sm text-muted-foreground">{user.role}</span>
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
    </div>
  );
}
