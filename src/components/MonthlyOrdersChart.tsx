import React, { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'
import { Line } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface DailyOrderData {
  day: number
  date: string
  orders: number
}

interface MonthlyOrdersChartProps {
  dailyOrdersData: DailyOrderData[]
  currentMonth: {
    name: string
    year: number
    month: number
  }
}

export default function MonthlyOrdersChart({ dailyOrdersData, currentMonth }: MonthlyOrdersChartProps) {
  const chartRef = useRef<ChartJS<'line', number[], string>>(null)

  // Calculate max value with padding for better visualization
  const maxOrderValue = Math.max(...dailyOrdersData.map(d => d.orders))
  const suggestedMax = maxOrderValue === 0 ? 10 : Math.ceil(maxOrderValue * 1.4) // Add 40% padding

  // Prepare chart data
  const chartData = {
    labels: dailyOrdersData.map(data => data.day.toString()),
    datasets: [
      {
        label: 'Orders',
        data: dailyOrdersData.map(data => data.orders),
        borderColor: '#6366f1', // Indigo-500
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#4f46e5', // Indigo-600
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
        fill: true,
        tension: 0.4, // Smooth curve
      }
    ]
  }

  // Chart options
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend for cleaner look
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#6366f1',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function(context) {
            const dayNum = context[0].label
            const dataPoint = dailyOrdersData.find(d => d.day.toString() === dayNum)
            if (dataPoint) {
              const date = new Date(dataPoint.date)
              return date.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })
            }
            return `Day ${dayNum}`
          },
          label: function(context) {
            const orders = context.parsed.y
            return orders === 1 ? '1 order' : `${orders} orders`
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: `Days in ${currentMonth.name}`,
          color: '#6b7280',
          font: {
            size: 12,
            weight: 'normal'
          }
        },
        grid: {
          display: true,
          color: 'rgba(156, 163, 175, 0.2)',
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11
          },
          maxTicksLimit: 15, // Prevent overcrowding on mobile
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Number of Orders',
          color: '#6b7280',
          font: {
            size: 12,
            weight: 'normal'
          }
        },
        grid: {
          display: true,
          color: 'rgba(156, 163, 175, 0.2)',
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11
          },
          precision: 0, // Only show whole numbers
        },
        beginAtZero: true,
        suggestedMax: suggestedMax,
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    elements: {
      point: {
        hoverRadius: 8
      }
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">This Month's Orders</h3>
          <p className="text-sm text-gray-500 mt-1">
            Daily order count for {currentMonth.name}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Orders</span>
        </div>
      </div>
      
      <div className="h-80">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      
      {/* Chart Summary */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Total orders this month: <span className="font-semibold text-gray-900">
              {dailyOrdersData.reduce((sum, data) => sum + data.orders, 0)}
            </span>
          </span>
          <span>
            Peak day: <span className="font-semibold text-gray-900">
              {Math.max(...dailyOrdersData.map(d => d.orders))} orders
            </span>
          </span>
        </div>
      </div>
    </div>
  )
} 