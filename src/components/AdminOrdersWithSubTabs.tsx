import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import AdminOrdersManagement from './AdminOrdersManagement'
import AdminCustomersManagement from './AdminCustomersManagement'

export default function AdminOrdersWithSubTabs() {
  const router = useRouter()
  const [activeSubTab, setActiveSubTab] = useState('order-management')

  // Handle query parameter navigation for sub-tabs
  useEffect(() => {
    const handleRouteChange = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const page = urlParams.get('p')
      
      // Check if we're on the orders tab and have a sub-tab specified
      if (page === 'orders-customers') {
        setActiveSubTab('customers')
      } else if (page === 'orders-management' || page === 'orders') {
        setActiveSubTab('order-management')
      }
    }

    // Check route on initial load
    handleRouteChange()

    // Listen for route changes
    const handlePopState = () => handleRouteChange()
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const handleSubTabChange = (subTab: string) => {
    setActiveSubTab(subTab)
    
    // Update URL query parameter to reflect sub-tab
    if (subTab === 'customers') {
      router.replace('/admin?p=orders-customers', undefined, { shallow: true })
    } else {
      router.replace('/admin?p=orders-management', undefined, { shallow: true })
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => handleSubTabChange('order-management')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === 'order-management'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Order Management
            </button>
            <button
              onClick={() => handleSubTabChange('customers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === 'customers'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Customers
            </button>
          </nav>
        </div>
      </div>

      {/* Sub-tab Content */}
      <div className="min-h-[500px]">
        {activeSubTab === 'order-management' ? (
          <AdminOrdersManagement />
        ) : (
          <AdminCustomersManagement />
        )}
      </div>
    </div>
  )
}
