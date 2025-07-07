'use client'

import { ArrowLeft, Bell, Clock, Users, Calendar, Volume2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const NotificationRow = ({ icon: Icon, title, description, defaultChecked = false }: { icon: React.ElementType, title: string, description: string, defaultChecked?: boolean }) => (
    <div className="flex items-center gap-4 py-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
        <div className="flex-grow">
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Switch defaultChecked={defaultChecked} />
    </div>
);

export function PushNotifications({ onBack }: { onBack: () => void }) {
    return (
        <div className="bg-gray-50 dark:bg-zinc-900 p-4 min-h-screen">
            <header className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-1">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-bold text-foreground">Notifikasi Push</h1>
            </header>

            <div className="text-center mb-8">
                <Bell className="h-12 w-12 text-primary mx-auto mb-2" />
                <h2 className="text-2xl font-bold">Pengaturan Notifikasi</h2>
                <p className="text-muted-foreground">Sesuaikan cara Anda menerima notifikasi dan peringatan</p>
            </div>

            <Card className="mb-6">
                <CardContent className="p-4 pt-2">
                     <h3 className="font-semibold text-lg my-2">Notifikasi Umum</h3>
                     <Separator />
                     <div className="divide-y divide-border">
                        <NotificationRow icon={Bell} title="Notifikasi Push" description="Terima notifikasi push di perangkat Anda" defaultChecked />
                        <NotificationRow icon={Clock} title="Pengingat Kehadiran" description="Dapatkan pengingat untuk melakukan absensi" defaultChecked />
                        <NotificationRow icon={Users} title="Pembaruan Kelas" description="Notifikasi tentang jadwal dan perubahan kelas" />
                        <NotificationRow icon={Calendar} title="Peringatan Sistem" description="Notifikasi dan pembaruan sistem penting" defaultChecked />
                     </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4 pt-2">
                     <h3 className="font-semibold text-lg my-2">Gaya Notifikasi</h3>
                     <Separator />
                     <div className="divide-y divide-border">
                        <NotificationRow icon={Volume2} title="Suara" description="Mainkan suara untuk notifikasi" defaultChecked />
                     </div>
                </CardContent>
            </Card>
        </div>
    );
}
