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
    { day: "Mon", present: 350 },
    { day: "Tue", present: 365 },
    { day: "Wed", present: 355 },
    { day: "Thu", present: 370 },
    { day: "Fri", present: 360 },
];

const chartConfig = {
    present: {
        label: "Present",
        color: "hsl(var(--primary))",
    },
} satisfies ChartConfig;

export function AttendanceChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Weekly Attendance</CardTitle>
                <CardDescription>Student presence over the last week.</CardDescription>
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
