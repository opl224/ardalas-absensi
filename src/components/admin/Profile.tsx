'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { User, Mail, Building2, Bell, Shield, LogOut } from "lucide-react";

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div className="flex items-center gap-4 py-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium text-foreground">{value}</p>
        </div>
    </div>
);

export function Profile() {
    return (
        <div className="bg-gray-50 dark:bg-zinc-900 p-4 min-h-screen">
            <header className="mb-6">
                <h1 className="text-xl font-bold text-foreground">Profile</h1>
            </header>

            <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-16 w-16">
                    <AvatarImage src="https://placehold.co/100x100.png" alt="Admin User" data-ai-hint="person portrait" />
                    <AvatarFallback>AU</AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-xl font-bold text-foreground">Admin User</p>
                    <p className="text-sm text-muted-foreground">Administrator</p>
                </div>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-lg">Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-border pt-0">
                   <InfoRow icon={User} label="Full Name" value="Admin User" />
                   <InfoRow icon={Mail} label="Email" value="admin@school.edu" />
                   <InfoRow icon={Building2} label="Department" value="Administration" />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Settings</CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-border pt-0">
                    <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-4">
                            <Bell className="h-6 w-6 text-muted-foreground" />
                            <span className="font-medium text-foreground">Push Notifications</span>
                        </div>
                        <Switch id="notifications-switch" />
                    </div>
                     <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-4">
                            <Shield className="h-6 w-6 text-muted-foreground" />
                            <span className="font-medium text-foreground">Privacy</span>
                        </div>
                    </div>
                     <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-4 text-destructive">
                            <LogOut className="h-6 w-6" />
                            <span className="font-medium">Logout</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
