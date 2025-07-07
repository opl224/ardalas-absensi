"use client"

import { Bar, BarChart as RechartsBarChart, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"


const chartData = [
    { day: "Sen", present: 350 },
    { day: "Sel", present: 365 },
    { day: "Rab", present: 355 },
    { day: "Kam", present: 370 },
    { day: "Jum", present: 360 },
];

const chartConfig = {
    present: {
        label: "Hadir",
        color: "hsl(var(--primary))",
    },
} satisfies ChartConfig;

export function AttendanceChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Kehadiran Mingguan</CardTitle>
                <CardDescription>Kehadiran siswa selama seminggu terakhir.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <RechartsBarChart data={chartData} accessibilityLayer>
                    <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Bar dataKey="present" fill="var(--color-present)" radius={4} />
                </RechartsBarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
