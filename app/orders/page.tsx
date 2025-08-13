'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import {
  Package,
  Calendar,
  CreditCard,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Filter,
  Search,
  RefreshCw,
  ExternalLink,
  FileText,
  Star,
  TrendingUp
} from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  planName: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  createdAt: string;
  nextBilling?: string;
  documentsProcessed: number;
  documentsLimit: number;
  features: string[];
}

const OrdersPage = () => {
  const { user, isLoaded } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for demonstration
  const mockOrders: Order[] = [
    {
      id: '1',
      orderNumber: 'ORD-2024-001',
      planName: 'Professional',
      amount: 49,
      status: 'completed',
      createdAt: '2024-01-15T10:00:00Z',
      nextBilling: '2024-02-15T10:00:00Z',
      documentsProcessed: 247,
      documentsLimit: 500,
      features: ['Premium TTS', 'OCR Processing', 'Team Collaboration', 'API Access']
    },
    {
      id: '2',
      orderNumber: 'ORD-2024-002',
      planName: 'Personal',
      amount: 19,
      status: 'completed',
      createdAt: '2024-01-01T10:00:00Z',
      nextBilling: '2024-02-01T10:00:00Z',
      documentsProcessed: 78,
      documentsLimit: 100,
      features: ['Local AI Processing', 'Basic TTS', 'Email Support']
    },
    {
      id: '3',
      orderNumber: 'ORD-2023-045',
      planName: 'Enterprise',
      amount: 149,
      status: 'completed',
      createdAt: '2023-12-15T10:00:00Z',
      nextBilling: '2024-01-15T10:00:00Z',
      documentsProcessed: 1247,
      documentsLimit: -1, // unlimited
      features: ['Custom AI Models', '24/7 Support', 'On-premise Deployment', 'Dedicated Manager']
    }
  ];

  useEffect(() => {
    if (isLoaded && user) {
      // In a real app, fetch orders from your API
      setTimeout(() => {
        setOrders(mockOrders);
        setLoading(false);
      }, 1000);
    } else if (isLoaded && !user) {
      setLoading(false);
    }
  }, [isLoaded, user]);

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'pending':
        return `${baseClasses} bg-amber-100 text-amber-800`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'cancelled':
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.status === filter;
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.planName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const currentPlan = orders.find(order => order.status === 'completed' && order.nextBilling);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-lg text-gray-700">Loading your orders...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-8">
            Please sign in to view your orders and subscription details.
          </p>
          <Link
            href="/sign-in?redirect=/orders"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Sign In
            <ExternalLink className="ml-2 w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
              <p className="mt-2 text-gray-600">
                Manage your subscriptions and view order history
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Upgrade Plan
              <TrendingUp className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Plan Overview */}
        {currentPlan && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-2xl font-bold mb-2">Current Plan</h3>
                <p className="text-indigo-100">{currentPlan.planName}</p>
                <p className="text-3xl font-bold mt-2">${currentPlan.amount}/month</p>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Usage This Month</h4>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Documents Processed</span>
                      <span>{currentPlan.documentsProcessed} / {currentPlan.documentsLimit === -1 ? 'Unlimited' : currentPlan.documentsLimit}</span>
                    </div>
                    <div className="w-full bg-indigo-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full" 
                        style={{ 
                          width: currentPlan.documentsLimit === -1 ? '30%' : 
                                `${(currentPlan.documentsProcessed / currentPlan.documentsLimit) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Next Billing</h4>
                <p className="text-indigo-100">
                  {currentPlan.nextBilling ? formatDate(currentPlan.nextBilling) : 'N/A'}
                </p>
                <button className="mt-4 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors">
                  Manage Subscription
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <div className="flex space-x-2">
                {(['all', 'completed', 'pending', 'failed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === status
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600">
                {filter !== 'all' || searchTerm 
                  ? 'Try adjusting your filters or search terms.'
                  : 'Start with your first subscription to begin processing documents.'}
              </p>
              {filter === 'all' && !searchTerm && (
                <Link
                  href="/pricing"
                  className="inline-flex items-center mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  View Plans
                  <ExternalLink className="ml-2 w-4 h-4" />
                </Link>
              )}
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <FileText className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {order.planName} Plan
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Order #{order.orderNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={getStatusBadge(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      {getStatusIcon(order.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Amount</p>
                      <p className="text-2xl font-bold text-gray-900">${order.amount}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Order Date</p>
                      <p className="text-gray-900">{formatDate(order.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Documents Used</p>
                      <p className="text-gray-900">
                        {order.documentsProcessed} / {order.documentsLimit === -1 ? '∞' : order.documentsLimit}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Next Billing</p>
                      <p className="text-gray-900">
                        {order.nextBilling ? formatDate(order.nextBilling) : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-500 mb-2">Features Included:</p>
                    <div className="flex flex-wrap gap-2">
                      {order.features.map((feature, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Created {formatDate(order.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </button>
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      <Download className="w-4 h-4 mr-2" />
                      Invoice
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Need Help?</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Have questions about your subscription or billing? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                Contact Support
                <ExternalLink className="ml-2 w-4 h-4" />
              </button>
              <Link
                href="/pricing"
                className="inline-flex items-center px-6 py-3 border border-indigo-300 text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50 transition-colors"
              >
                View All Plans
                <Star className="ml-2 w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;