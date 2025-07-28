import { NextPageContext } from 'next';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface ErrorProps {
  statusCode: number;
  hasGetInitialPropsRun?: boolean;
  err?: Error;
}

function Error({ statusCode, hasGetInitialPropsRun, err }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Redirect 404 errors to our custom error page
    if (statusCode === 404) {
      router.replace('/error');
      return;
    }
  }, [statusCode, router]);

  // For non-404 errors, show a generic error page
  if (statusCode === 404) {
    // This will only show briefly before redirect
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#59e3a5]"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Error {statusCode} - FASHO</title>
        <meta name="description" content="An error occurred on our website." />
        <link rel="icon" href="/fasho_ico/favicon.ico" />
      </Head>
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <div className="mb-6">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent mb-4">
              {statusCode}
            </h1>
            <p className="text-xl text-white mb-4">
              {statusCode === 500
                ? 'Internal Server Error'
                : 'An Error Occurred'}
            </p>
            <p className="text-gray-400 mb-6">
              We're experiencing some technical difficulties. Please try again later.
            </p>
          </div>
          <div className="space-y-3">
            <a
              href="/"
              className="inline-block bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-[#14c0ff]/30 transition-all duration-300 transform hover:scale-105"
            >
              Go Home
            </a>
            <br />
            <button
              onClick={() => window.history.back()}
              className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors duration-300"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode ?? 500 : 404;
  return { statusCode };
};

export default Error; 