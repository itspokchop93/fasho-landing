import { useState } from 'react';

interface DiagnosticResult {
  step: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

interface DiagnosticResponse {
  success: boolean;
  results: DiagnosticResult[];
  summary: {
    total: number;
    successful: number;
    warnings: number;
    errors: number;
  };
}

export default function EmailDiagnostic() {
  const [testEmail, setTestEmail] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResponse | null>(null);

  const runDiagnostic = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    setIsRunning(true);
    setResults(null);

    try {
      const response = await fetch('/api/email-diagnostic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testEmail }),
      });

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Diagnostic failed:', error);
      alert('Diagnostic failed. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Email System Diagnostic
          </h1>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Email Address
            </label>
            <div className="flex gap-4">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email address to test delivery"
                disabled={isRunning}
              />
              <button
                onClick={runDiagnostic}
                disabled={isRunning}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isRunning ? 'Running...' : 'Run Diagnostic'}
              </button>
            </div>
          </div>

          {isRunning && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-800">Running comprehensive email diagnostic...</span>
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Diagnostic Summary
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {results.summary.total}
                    </div>
                    <div className="text-sm text-gray-600">Total Tests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {results.summary.successful}
                    </div>
                    <div className="text-sm text-gray-600">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {results.summary.warnings}
                    </div>
                    <div className="text-sm text-gray-600">Warnings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {results.summary.errors}
                    </div>
                    <div className="text-sm text-gray-600">Errors</div>
                  </div>
                </div>
              </div>

              {/* Detailed Results */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Detailed Results
                </h2>
                <div className="space-y-4">
                  {results.results.map((result, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <span className="text-xl mr-3">
                            {getStatusIcon(result.status)}
                          </span>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {result.step}
                            </h3>
                            <p className={`text-sm ${getStatusColor(result.status)}`}>
                              {result.message}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {result.details && (
                        <div className="mt-3 pl-8">
                          <details className="cursor-pointer">
                            <summary className="text-sm text-gray-600 hover:text-gray-800">
                              View Details
                            </summary>
                            <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Recommendations
                </h2>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>• Check your spam/junk folder for test emails</li>
                  <li>• Verify your domain's SPF, DKIM, and DMARC records</li>
                  <li>• Ensure your MailJet sender email is verified</li>
                  <li>• Check if your IP/domain is blacklisted</li>
                  <li>• Review MailJet account status and sending limits</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 