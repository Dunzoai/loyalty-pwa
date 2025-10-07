'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CustomerDetail {
  id: string;
  name: string;
  email: string;
  redemption_count: number;
  unique_perks_redeemed: number;
  created_at: string;
  last_activity: string;
}

export default function CustomerDetailsPage() {
  const [customers, setCustomers] = useState<CustomerDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total_customers: 0,
    active_customers: 0,
    returning_customers: 0
  });
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/customers/details');
        if (!res.ok) throw new Error('Failed to fetch customer details');
        
        const data = await res.json();
        setCustomers(data.customers);
        setStats({
          total_customers: data.total_customers,
          active_customers: data.active_customers,
          returning_customers: data.returning_customers
        });
      } catch (err) {
        console.error('Error fetching customer details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Determine activity level badge
  const getActivityBadge = (redemptionCount: number) => {
    if (redemptionCount === 0) return 'bg-gray-900/40 text-gray-400 border-gray-700';
    if (redemptionCount === 1) return 'bg-blue-900/40 text-blue-300 border-blue-800';
    if (redemptionCount <= 3) return 'bg-green-900/40 text-green-300 border-green-800';
    return 'bg-purple-900/40 text-purple-300 border-purple-800';
  };
  
  // Get activity level text
  const getActivityLevel = (redemptionCount) => {
    if (redemptionCount === 0) return 'Inactive';
    if (redemptionCount === 1) return 'New';
    if (redemptionCount <= 3) return 'Active';
    return 'Loyal';
  };

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <header className="bg-gray-900 shadow sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white">Customer Details</h1>
              <p className="text-sm text-gray-400 mt-1">
                Overview of all customers and their activity
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center px-4 py-2 border border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-200 bg-gray-800 hover:bg-gray-700 transition-colors duration-150"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 relative">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-full h-full border-t-4 border-blue-500 rounded-full animate-spin"></div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
            <button 
              className="mt-2 px-3 py-1 bg-red-900/40 hover:bg-red-800/60 text-sm rounded-md"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4 shadow-md">
                <div className="text-3xl font-bold text-white">{stats.total_customers}</div>
                <div className="text-sm text-gray-400 mt-1">Total Customers</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 shadow-md">
                <div className="text-3xl font-bold text-white">{stats.active_customers}</div>
                <div className="text-sm text-gray-400 mt-1">Active Customers</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 shadow-md">
                <div className="text-3xl font-bold text-white">{stats.returning_customers}</div>
                <div className="text-sm text-gray-400 mt-1">Returning Customers</div>
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <div className="px-4 py-5 border-b border-gray-700">
                <h3 className="text-lg font-medium leading-6 text-white">
                  All Customers
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Sorted by total redemptions
                </p>
              </div>
              
              {customers.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="mt-2">No customers found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Customer
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Activity
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Total Redemptions
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Unique Perks
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Joined
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Last Activity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {customers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-purple-900/60 flex items-center justify-center text-purple-300">
                                {customer.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-white">{customer.name}</div>
                                <div className="text-sm text-gray-400">{customer.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs leading-5 font-medium rounded-full border ${getActivityBadge(customer.redemption_count)}`}>
                              {getActivityLevel(customer.redemption_count)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {customer.redemption_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {customer.unique_perks_redeemed}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {formatDate(customer.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {formatDate(customer.last_activity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}