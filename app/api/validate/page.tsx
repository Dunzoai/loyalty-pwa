import React from 'react';

const RedemptionConfirmation = () => {
  // This would come from your API call in a real app
  const redemptionData = {
    perk_title: "2 for 1 Tuesday",
    perk_description: "Get a free cold brew with purchase of one",
    user_email: "marcmatloski@gmail.com",
    status: "REDEEMED",
    expires_at: "9/25/2025 at 10:07:56 AM",
    created_at: "9/25/2025",
    code: "pom7hT7_bpTHTjiavCw"
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-700">
        
        {/* Success Header */}
        <div className="bg-green-500 rounded-xl p-6 text-center mb-6 relative overflow-hidden">
          <div className="text-4xl mb-2">🎉</div>
          <h1 className="text-white text-2xl font-bold">
            Redemption Confirmed!
          </h1>
        </div>

        {/* Perk Details */}
        <div className="bg-blue-900/30 border-l-4 border-blue-400 rounded-r-lg p-4 mb-6">
          <h2 className="text-blue-300 text-lg font-semibold mb-2">
            {redemptionData.perk_title}
          </h2>
          <p className="text-gray-300 text-sm">
            {redemptionData.perk_description}
          </p>
        </div>

        {/* Customer Details */}
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-medium">Customer:</span>
            <span className="text-white font-mono text-sm">
              {redemptionData.user_email}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-medium">Status:</span>
            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
              {redemptionData.status}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-medium">Expires:</span>
            <span className="text-gray-300 text-sm">
              {redemptionData.expires_at}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-medium">Created:</span>
            <span className="text-gray-300 text-sm">
              {redemptionData.created_at}
            </span>
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-2">
            <span className="text-green-400 mr-2">✓</span>
            <span className="text-green-300 font-semibold">
              Redemption Successful!
            </span>
          </div>
          <p className="text-green-200 text-sm">
            This perk has been redeemed for the customer.
          </p>
        </div>

        {/* Redemption Code */}
        <div className="text-center">
          <p className="text-gray-500 text-xs mb-2">Redemption Code</p>
          <p className="text-blue-400 font-mono text-lg tracking-wide">
            {redemptionData.code}
          </p>
        </div>

      </div>
    </div>
  );
};

export default RedemptionConfirmation;