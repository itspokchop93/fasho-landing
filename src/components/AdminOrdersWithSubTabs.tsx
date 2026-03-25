import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import AdminOrdersManagement from './AdminOrdersManagement'
import AdminCustomersManagement from './AdminCustomersManagement'
import AdminBlacklistedManagement from './AdminBlacklistedManagement'

export default function AdminOrdersWithSubTabs() {
  const router = useRouter()
  const [activeSubTab, setActiveSubTab] = useState('order-management')

  // Handle query parameter navigation for sub-tabs
  useEffect(() => {
    const handleRouteChange = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const page = urlParams.get('p')
      
      if (page === 'orders-customers') {
        setActiveSubTab('customers')
      } else if (page === 'orders-blacklisted') {
        setActiveSubTab('blacklisted')
      } else if (page === 'orders-management' || page === 'orders') {
        setActiveSubTab('order-management')
      }
    }

    handleRouteChange()

    const handlePopState = () => handleRouteChange()
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const handleSubTabChange = (subTab: string) => {
    setActiveSubTab(subTab)
    
    if (subTab === 'customers') {
      router.replace('/admin?p=orders-customers', undefined, { shallow: true })
    } else if (subTab === 'blacklisted') {
      router.replace('/admin?p=orders-blacklisted', undefined, { shallow: true })
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
            <button
              onClick={() => handleSubTabChange('blacklisted')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === 'blacklisted'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Blacklisted
            </button>
          </nav>
        </div>
      </div>

      {/* Sub-tab Content */}
      <div className="min-h-[500px]">
        {activeSubTab === 'order-management' ? (
          <AdminOrdersManagement />
        ) : activeSubTab === 'customers' ? (
          <AdminCustomersManagement />
        ) : (
          <AdminBlacklistedManagement />
        )}
      </div>
    </div>
  )
}
