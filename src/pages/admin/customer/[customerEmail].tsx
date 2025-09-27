import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { verifyAdminToken, getAdminTokenFromRequest } from '../../../utils/admin/auth';
import AdminAccessDenied from '../../../components/AdminAccessDenied';
import type { CustomerDetailData } from '../../api/admin/customer/[customerEmail]';

interface CustomerDetailPageProps {
  adminSession: any;
  accessDenied?: boolean;
}

export default function CustomerDetailPage({ adminSession, accessDenied }: CustomerDetailPageProps) {
  const router = useRouter();
  const { customerEmail } = router.query;
  
  // Admin access control
  if (accessDenied || !adminSession) {
    return <AdminAccessDenied />;
  }
  
  const [customer, setCustomer] = useState<CustomerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (customerEmail && typeof customerEmail === 'string') {
      fetchCustomerDetails(customerEmail);
    }
  }, [customerEmail]);

  // Auto-refresh customer details every 60 seconds
  useEffect(() => {
    if (!customerEmail || typeof customerEmail !== 'string') return;

    const interval = setInterval(() => {
      fetchCustomerDetails(customerEmail);
    }, 60000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, [customerEmail]);

  const fetchCustomerDetails = async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customer/${encodeURIComponent(email)}`);
      const data = await res.json();
      
      if (data.success) {
        setCustomer(data.customer);
        setLastUpdated(new Date());
        setError('');
      } else {
        setError(data.message || 'Failed to fetch customer details');
      }
    } catch (err) {
      setError('Failed to fetch customer details');
      console.error('Error fetching customer details:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleOrderClick = (orderId: string) => {
    // Open order details in new tab
    window.open(`/admin/order/${orderId}`, '_blank');
  };

  const handleBackClick = () => {
    router.push('/admin?p=orders-customers');
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading Customer Details - Fasho Admin</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading customer details...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Error - Fasho Admin</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">Error</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleBackClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Customers
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!customer) {
    return (
      <>
        <Head>
          <title>Customer Not Found - Fasho Admin</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-600 text-xl mb-4">Customer Not Found</div>
            <button
              onClick={handleBackClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Customers
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{customer.customer_info.customer_name} - Customer Details - Fasho Admin</title>
        <meta name="description" content={`Customer details for ${customer.customer_info.customer_name}`} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackClick}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Customers
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <h1 className="text-3xl font-bold text-gray-900">Customer Details</h1>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Customer since</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatDate(customer.customer_info.date_joined)}
                </div>
                {lastUpdated && (
                  <div className="text-xs text-gray-400 mt-1">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Customer Information */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Customer Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <div className="text-lg font-semibold text-gray-900">
                      {customer.customer_info.customer_name}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <div className="text-gray-900">
                      {customer.customer_info.customer_email}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Total Purchases</label>
                    <div className="text-lg font-semibold text-gray-900">
                      {customer.customer_info.total_purchases}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Total Spend</label>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(customer.customer_info.total_spend)}
                    </div>
                  </div>

                  {/* Billing Information */}
                  {customer.customer_info.billing_info && (
                    <>
                      <div className="border-t border-gray-200 pt-4 mt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h3>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div>
                            {customer.customer_info.billing_info.firstName} {customer.customer_info.billing_info.lastName}
                          </div>
                          {customer.customer_info.billing_info.address && (
                            <div>{customer.customer_info.billing_info.address}</div>
                          )}
                          {customer.customer_info.billing_info.city && (
                            <div>
                              {customer.customer_info.billing_info.city}
                              {customer.customer_info.billing_info.state && `, ${customer.customer_info.billing_info.state}`}
                              {customer.customer_info.billing_info.zip && ` ${customer.customer_info.billing_info.zip}`}
                            </div>
                          )}
                          {customer.customer_info.billing_info.country && (
                            <div>{customer.customer_info.billing_info.country}</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Purchase History */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Purchase History</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {customer.orders.length} total orders
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customer.orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {order.order_number}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadgeClass(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-green-600">
                              {formatCurrency(order.total)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {order.items_count} {order.items_count === 1 ? 'item' : 'items'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleOrderClick(order.id)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                            >
                              OPEN
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {customer.orders.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No orders found for this customer
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    console.log('🔐 CUSTOMER-DETAIL-SSR: Checking admin authentication...')
    
    // Get admin session token from request
    const token = getAdminTokenFromRequest(context.req as any)
    
    if (!token) {
      console.log('🔐 CUSTOMER-DETAIL-SSR: No admin session token found')
      return {
        redirect: {
          destination: '/a-login',
          permanent: false,
        },
      }
    }

    // Verify admin token
    const adminUser = verifyAdminToken(token)
    
    if (!adminUser) {
      console.log('🔐 CUSTOMER-DETAIL-SSR: Invalid admin session token')
      return {
        redirect: {
          destination: '/a-login',
          permanent: false,
        },
      }
    }

    if (!adminUser.is_active) {
      console.log('🔐 CUSTOMER-DETAIL-SSR: Admin account is inactive:', adminUser.email)
      return {
        props: {
          adminSession: null,
          accessDenied: true
        },
      }
    }

    console.log('🔐 CUSTOMER-DETAIL-SSR: Admin authenticated successfully:', adminUser.email, 'role:', adminUser.role)

    return {
      props: {
        adminSession: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
        },
      },
    }
  } catch (error) {
    console.error('🔐 CUSTOMER-DETAIL-SSR: Authentication error:', error)
    return {
      redirect: {
        destination: '/a-login',
        permanent: false,
      },
    }
  }
}
