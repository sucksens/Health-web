import { useMemo } from "react"
import ReactECharts from "echarts-for-react"
import type { BodyMetricOut } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface BodyMetricsChartProps {
  metrics: BodyMetricOut[]
}

export function BodyMetricsChart({ metrics }: BodyMetricsChartProps) {
  const option = useMemo(() => {
    const sorted = [...metrics].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    )

    const dates = sorted.map((m) => {
      const d = new Date(m.recorded_at)
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
    })

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
      },
      legend: {
        data: ["Peso (kg)", "IMC"],
        top: 0,
      },
      grid: {
        left: 50,
        right: 50,
        bottom: 30,
        top: 40,
      },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { fontSize: 11 },
      },
      yAxis: [
        {
          type: "value",
          name: "Peso (kg)",
          nameTextStyle: { fontSize: 11 },
          axisLabel: { fontSize: 11 },
        },
        {
          type: "value",
          name: "IMC",
          nameTextStyle: { fontSize: 11 },
          axisLabel: { fontSize: 11 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Peso (kg)",
          type: "line",
          data: sorted.map((m) => m.weight_kg),
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: "var(--color-chart-1, #22c55e)" },
          lineStyle: { width: 2 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(34,197,94,0.25)" },
                { offset: 1, color: "rgba(34,197,94,0.02)" },
              ],
            },
          },
        },
        {
          name: "IMC",
          type: "line",
          yAxisIndex: 1,
          data: sorted.map((m) => m.bmi),
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: "var(--color-chart-3, #4d7c0f)" },
          lineStyle: { width: 2 },
        },
      ],
    }
  }, [metrics])

  if (metrics.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Evolucion</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 300 }} />
      </CardContent>
    </Card>
  )
}
