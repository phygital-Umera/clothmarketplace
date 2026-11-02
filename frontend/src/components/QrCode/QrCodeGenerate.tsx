import {useAuthContext} from '@/context/AuthContext';
import {useGetCaterorById} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {Route} from '@/routes/_app/_event/qrgenerator.$id';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import React from 'react';
import {BiArrowBack, BiDownload} from 'react-icons/bi';
import {FaPhone} from 'react-icons/fa6';
import {MdLocationOn} from 'react-icons/md';
import QRCode from 'react-qr-code';

interface QrCodeGeneratorProps {
  id?: string;
}

const QrCodeGenerator: React.FC<QrCodeGeneratorProps> = () => {
  const {id} = Route.useParams<{id: string}>();
  const {user} = useAuthContext();
  console.log('UserDaaaaaaa', user);
  const {data: caterorLogo} = useGetCaterorById(user?.caterorId ?? '');

  const QR_BASE_URL =
    import.meta.env.VITE_QR_BASE_URL || 'http://localhost:5173';
  const BASE_URL = `${QR_BASE_URL}/qr/${id || 'default'}`;

  const {
    data: caterorData,
    isLoading,
    isError,
  } = useGetCaterorById(user?.caterorId ?? '');

  const handleBack = () => {
    window.history.back();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('pdfContent');
    if (element) {
      // Show loading state
      const downloadBtn = document.querySelector('.download-btn');
      if (downloadBtn) {
        downloadBtn.innerHTML = 'Generating PDF...';
        downloadBtn.classList.add('opacity-75');
      }

      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: true,
          allowTaint: true,
          imageTimeout: 15000,
        });

        const imageData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasAspectRatio = canvas.width / canvas.height;
        let contentWidth = pdfWidth * 0.8;
        let contentHeight = contentWidth / canvasAspectRatio;

        if (contentHeight > pdfHeight * 0.8) {
          contentHeight = pdfHeight * 0.8;
          contentWidth = contentHeight * canvasAspectRatio;
        }

        const offsetX = (pdfWidth - contentWidth) / 2;
        const offsetY = (pdfHeight - contentHeight) / 2;

        pdf.addImage(
          imageData,
          'JPEG',
          offsetX,
          offsetY,
          contentWidth,
          contentHeight,
        );
        pdf.save('qr-code.pdf');
      } catch (error) {
        console.error('Error generating PDF:', error);
      } finally {
        // Reset button state
        if (downloadBtn) {
          downloadBtn.innerHTML = 'Download PDF';
          downloadBtn.classList.remove('opacity-75');
        }
      }
    }
  };

  if (isLoading)
    return (
      <div className="to-gray-100 dark:from-gray-900 dark:to-gray-800 flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50">
        <div className="dark:bg-gray-800 rounded-xl bg-white p-8 text-center shadow-lg">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="text-gray-600 dark:text-gray-300 mt-4">
            Loading user data...
          </p>
        </div>
      </div>
    );

  if (isError)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="dark:bg-gray-800 rounded-xl bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-bold text-red-500 dark:text-red-400">
            Error loading user data
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Please try again later
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="dark:bg-gray-800 mx-auto max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-black">
        {/* Main Content */}
        <div className="p-6 md:p-8">
          {/* PDF Content */}
          <div
            id="pdfContent"
            className="mb-8 rounded-xl bg-white p-6 dark:bg-black"
          >
            {/* User Information Section */}
            <div className="mb-8 text-center">
              {caterorData?.data?.user?.fullname ? (
                <h3 className="text-gray-800 text-xl font-bold dark:text-white">
                  {caterorData.data.user.fullname}
                </h3>
              ) : (
                <p className="text-red-500">Name not available</p>
              )}

              <div className="text-gray-600 dark:text-gray-300 mt-4 space-y-2">
                {caterorData?.data?.user?.phoneNumber && (
                  <div className="flex items-center justify-center">
                    <FaPhone className="mr-2 h-3 w-3" />
                    {caterorData.data.user.phoneNumber}
                  </div>
                )}

                {(caterorData?.data?.address || caterorData?.data?.city) && (
                  <div className="flex items-center justify-center">
                    <MdLocationOn className="mr-2 h-4 w-4" />
                    {caterorData?.data?.address || ''}
                    {caterorData?.data?.address && caterorData?.data?.city
                      ? ', '
                      : ''}
                    {caterorData?.data?.city || ''}
                  </div>
                )}
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center">
              <div className="border-gray-200 dark:border-gray-600 rounded-lg border bg-white p-4">
                <QRCode
                  value={BASE_URL}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                />
              </div>

              <div className="mt-6 text-center">
                <p className="text-gray-600 dark:text-gray-300 mb-2 text-sm">
                  Scan this QR Code to access:
                </p>
                <a
                  href={BASE_URL}
                  className="inline-block max-w-xs break-all text-blue-500 hover:underline dark:text-blue-400"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {BASE_URL}
                </a>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button
              className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center gap-2 rounded-lg px-6 py-3 transition-colors"
              onClick={handleBack}
            >
              <BiArrowBack className="h-5 w-5" />
              Back
            </button>
            <button
              className="download-btn flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-white shadow-md transition-all hover:from-blue-600 hover:to-blue-700"
              onClick={handleDownloadPdf}
            >
              <BiDownload className="h-5 w-5" />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrCodeGenerator;
