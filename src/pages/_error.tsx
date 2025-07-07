import { NextPageContext } from 'next';
import Head from 'next/head';

interface ErrorProps {
  statusCode: number;
  hasGetInitialPropsRun?: boolean;
  err?: Error;
}

function Error({ statusCode, hasGetInitialPropsRun, err }: ErrorProps) {
  return (
    <>
      <Head>
        <title>Error {statusCode} - Fasho.co</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="mb-4">
            <h1 className="text-6xl font-bold text-gray-900 mb-2">
              {statusCode}
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              {statusCode === 404
                ? 'Page not found'
                : statusCode === 500
                ? 'Internal server error'
                : 'An error occurred'}
            </p>
            <p className="text-gray-500 mb-6">
              {statusCode === 404
                ? "The page you're looking for doesn't exist."
                : "We're experiencing some technical difficulties. Please try again later."}
            </p>
          </div>
          <div className="space-y-3">
            <a
              href="/"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Go Home
            </a>
            <br />
            <button
              onClick={() => window.history.back()}
              className="text-indigo-600 hover:text-indigo-800 transition-colors"
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