import { useMemo } from "react"
import ReactECharts from "echarts-for-react"
import type { BloodPressureOut } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface BloodPressureChartProps {
  readings: BloodPressureOut[]
}

export function BloodPressureChart({ readings }: BloodPressureChartProps) {
  const option = useMemo(() => {
    const sorted = [...readings].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    )

    const dates = sorted.map((r) => {
      const d = new Date(r.recorded_at)
      return `${d.getDate()}/${d.getMonth() + 1}`
    })

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
      },
      legend: {
        data: ["Sistolica", "Diastolica"],
        top: 0,
      },
      grid: {
        left: 50,
        right: 20,
        bottom: 30,
        top: 40,
      },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: "value",
        name: "mmHg",
        nameTextStyle: { fontSize: 11 },
        axisLabel: { fontSize: 11 },
        min: (value: { min: number }) => Math.max(0, value.min - 10),
      },
      series: [
        {
          name: "Sistolica",
          type: "line",
          data: sorted.map((r) => r.systolic),
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: "#ef4444" },
          lineStyle: { width: 2 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(239,68,68,0.15)" },
                { offset: 1, color: "rgba(239,68,68,0.02)" },
              ],
            },
          },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { type: "dashed", width: 1 },
            data: [
              { yAxis: 120, lineStyle: { color: "#eab308" }, label: { formatter: "120 Elevated", fontSize: 9 } },
              { yAxis: 130, lineStyle: { color: "#f97316" }, label: { formatter: "130 Stage 1", fontSize: 9 } },
              { yAxis: 140, lineStyle: { color: "#ef4444" }, label: { formatter: "140 Stage 2", fontSize: 9 } },
            ],
          },
        },
        {
          name: "Diastolica",
          type: "line",
          data: sorted.map((r) => r.diastolic),
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: "#3b82f6" },
          lineStyle: { width: 2 },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { type: "dashed", width: 1 },
            data: [
              { yAxis: 80, lineStyle: { color: "#f97316" }, label: { formatter: "80", fontSize: 9 } },
              { yAxis: 90, lineStyle: { color: "#ef4444" }, label: { formatter: "90", fontSize: 9 } },
            ],
          },
        },
      ],
    }
  }, [readings])

  if (readings.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Evolucion de Presion Arterial</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 300 }} />
      </CardContent>
    </Card>
  )
}
