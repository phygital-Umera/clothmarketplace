/* eslint-disable  */
import LeftBottom from '@/assets/images/Bill/LeftBottom.png';
import LeftTop from '@/assets/images/Bill/LeftTop.png';
import RightBottom from '@/assets/images/Bill/RightBottom.png';
import RightTop from '@/assets/images/Bill/RightTop.png';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import React, {useEffect, useRef, useState} from 'react';
import GenericButton from '../Forms/Buttons/GenericButton';
import {useGetPaymentDetails} from '@/lib/react-query/queriesAndMutations/cateror/paymentdetails';
import {useGetTerms} from '@/lib/react-query/queriesAndMutations/cateror/termcondition';
import {useAuthContext} from '@/context/AuthContext';
import {useReactToPrint} from 'react-to-print';

// Utility functions for Indian date formatting
const formatIndianDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatDateRange = (startDate: string, endDate: string) => {
  const formattedStart = formatIndianDate(startDate);
  const formattedEnd = formatIndianDate(endDate);
  return formattedStart === formattedEnd
    ? formattedStart
    : `${formattedStart} to ${formattedEnd}`;
};

interface SubEvent {
  dishes: {dish: {name: string; category: {name: string}}}[];
  name: string;
  date: string;
  expectedCost: number;
  expectedPeople: number;
  actualPeople: number;
  discountGiven: number;
}

interface User {
  email: string;
  phoneNumber: string;
  fullname: string;
}

interface Cateror {
  user: User;
}

interface Client {
  user: User;
}

interface EventData {
  name: string;
  startDate: string;
  endDate: string;
  cateror: Cateror;
  client: Client;
  subEvents: SubEvent[];
  paidAmount: number;
}

interface MappedQuotationItem {
  SubEventName: string;
  date?: string;
  Menu: string;
  Cost: number;
  People: number;
  ActualPeople?: number;
}

interface ShowQuotationProps {
  image: string;
  mappedQuatation: MappedQuotationItem[];
  eventData: EventData;
  setShowQuotation?: (show: boolean) => void;
  totalAmount: number;
  discountAmount: number;
  invoices: string;
  totalExtraCost: number;
  refetch?: () => void;
}

const ShowBill: React.FC<ShowQuotationProps> = ({
  image,
  mappedQuatation,
  eventData,
  totalAmount,
  discountAmount,
  invoices,
  totalExtraCost,
  refetch,
}) => {
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const quotationRef = useRef<HTMLDivElement>(null);
  const formattedDate = formatIndianDate(new Date().toISOString());

  const {user} = useAuthContext();
  const id = user?.caterorId ?? '';
  const {data: termsResponse} = useGetTerms(id);
  const {data: paymentData} = useGetPaymentDetails(id);

  const findTotal = () => {
    if (!mappedQuatation?.length) {
      setTotal(0);
      return;
    }
    const calculatedTotal = mappedQuatation.reduce((sum, item) => {
      const maxPeople = Math.max(item.People || 0, item.ActualPeople || 0);
      return sum + (item.Cost || 0) * maxPeople;
    }, 0);
    setTotal(calculatedTotal);
  };

  // Calculate the final total (Sub Total + Extra Cost - Discount)
  const finalTotal = total + (totalExtraCost || 0) - (discountAmount || 0);

  // Calculate pending amount based on final total minus paid amount
  const pendingAmount = Math.max(0, finalTotal - (eventData.paidAmount || 0));

  useEffect(() => {
    findTotal();
  }, [mappedQuatation, eventData]);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Bill-${Math.random().toString(36).substring(7)}`,
    // pageStyle: @media print { body { -webkit-print-color-adjust: exact; } },
  });

  // const handleDownloadPdf = async () => {
  //   if (!quotationRef.current) return;
  //   setLoading(true);

  //   const pdf = new jsPDF('p', 'mm', 'a4');
  //   const pageWidth = pdf.internal.pageSize.getWidth();
  //   const pageHeight = pdf.internal.pageSize.getHeight();

  //   pdf.addImage(LeftTop, 'PNG', 0, 0, 40, 40);
  //   pdf.addImage(RightTop, 'PNG', pageWidth - 40, 0, 40, 40);
  //   pdf.addImage(LeftBottom, 'PNG', 0, pageHeight - 40, 40, 40);
  //   pdf.addImage(RightBottom, 'PNG', pageWidth - 40, pageHeight - 40, 40, 40);

  //   const canvas = await html2canvas(quotationRef.current, {
  //     scale: 3,
  //     useCORS: true,
  //     backgroundColor: '#f7f8f6',
  //     logging: false,
  //   });

  //   const imgWidth = pageWidth - 20;
  //   const imgHeight = (canvas.height * imgWidth) / canvas.width;

  //   let position = 0;
  //   let remainingHeight = imgHeight;

  //   while (remainingHeight > 0) {
  //     const sectionHeight = Math.min(remainingHeight, pageHeight - 20);
  //     const sectionCanvas = document.createElement('canvas');
  //     sectionCanvas.width = canvas.width;
  //     sectionCanvas.height = (sectionHeight / imgHeight) * canvas.height;

  //     const sectionContext = sectionCanvas.getContext('2d');
  //     const sourceY = (position / imgHeight) * canvas.height;

  //     if (sectionContext) {
  //       sectionContext.drawImage(
  //         canvas,
  //         0,
  //         sourceY,
  //         canvas.width,
  //         sectionCanvas.height,
  //         0,
  //         0,
  //         sectionCanvas.width,
  //         sectionCanvas.height,
  //       );
  //     }

  //     const sectionImgData = sectionCanvas.toDataURL('image/jpeg', 1.0);
  //     pdf.setFillColor(247, 248, 246);
  //     pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  //     pdf.addImage(sectionImgData, 'JPEG', 10, 10, imgWidth, sectionHeight);

  //     if (image && position === 0) {
  //       const logoElement = quotationRef.current.querySelector('img');
  //       if (logoElement) {
  //         const logoRect = logoElement.getBoundingClientRect();
  //         const containerRect = quotationRef.current.getBoundingClientRect();

  //         const logoX = logoRect.left - containerRect.left;
  //         const logoY = logoRect.top - containerRect.top;
  //         const logoWidth = logoRect.width;
  //         const logoHeight = logoRect.height;

  //         const logoCanvas = await html2canvas(logoElement as HTMLElement, {
  //           scale: 3,
  //           useCORS: true,
  //           backgroundColor: null,
  //           logging: false,
  //         });

  //         pdf.addImage(
  //           logoCanvas.toDataURL('image/png'),
  //           'PNG',
  //           10 + (logoX / containerRect.width) * imgWidth,
  //           10 + (logoY / containerRect.height) * imgHeight,
  //           (logoWidth / containerRect.width) * imgWidth,
  //           (logoHeight / containerRect.height) * imgHeight,
  //         );
  //       }
  //     }

  //     remainingHeight -= sectionHeight;
  //     position += sectionHeight;

  //     if (remainingHeight > 0) {
  //       pdf.addPage();
  //       pdf.addImage(LeftTop, 'PNG', 0, 0, 40, 40);
  //       pdf.addImage(RightTop, 'PNG', pageWidth - 40, 0, 40, 40);
  //       pdf.addImage(LeftBottom, 'PNG', 0, pageHeight - 40, 40, 40);
  //       pdf.addImage(
  //         RightBottom,
  //         'PNG',
  //         pageWidth - 40,
  //         pageHeight - 40,
  //         40,
  //         40,
  //       );
  //     }
  //   }

  //   setLoading(false);
  //   pdf.save('bill.pdf');
  // };

  if (!mappedQuatation || mappedQuatation.length === 0) {
    return <div className="text-center">No bill data available.</div>;
  }

  return (
    <div className="w-full bg-[#f7f8f6] p-4 sm:p-8">
      <div
        className="relative mx-auto bg-[#f7f8f6] font-serif shadow-lg sm:p-8"
        ref={printRef}
      >
        <div className="absolute left-1/2 top-8 z-10 -translate-x-1/2 transform">
          <img
            src={image}
            alt="Company Logo"
            className="h-20 w-auto object-contain sm:h-24"
          />
        </div>

        <div className="z-10 mt-28 flex h-full flex-col sm:mt-32">
          <div className="mb-6 text-center">
            <h1 className="font-croissant text-3xl font-extrabold text-[#343a40] sm:text-4xl">
              BILL
            </h1>
            <div className="mt-2 h-1 bg-[#6F7F65] opacity-30"></div>
          </div>

          {eventData && (
            <div className="mb-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
                <div className="w-full sm:w-1/2">
                  <div className="mb-2">
                    <p className="font-croissant text-lg font-bold text-[#6F7F65]">
                      Bill To:
                    </p>
                    <p className="mt-1 font-lora text-xl font-semibold text-[#343a40]">
                      {eventData?.client?.user?.fullname || 'N/A'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    <div>
                      <p className="font-croissant text-sm font-bold text-[#6F7F65]">
                        Phone:
                      </p>
                      <p className="font-lora text-[#343a40]">
                        {eventData?.client?.user?.phoneNumber || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="font-croissant text-sm font-bold text-[#6F7F65]">
                        Email:
                      </p>
                      <p className="font-lora text-[#343a40]">
                        {eventData?.client?.user?.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="w-full sm:w-1/2">
                  <div className="flex flex-col items-end">
                    <div className="mb-4 text-right">
                      <p className="font-croissant text-lg font-bold text-[#6F7F65]">
                        Bill Details
                      </p>
                      <p className="mt-1 font-lora text-[#343a40]">
                        <span className="font-semibold">Date:</span>{' '}
                        {formattedDate}
                      </p>
                      <p className="font-lora text-[#343a40]">
                        <span className="font-semibold">Bill No:</span>{' '}
                        {invoices || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h2 className="mb-4 font-croissant text-xl font-bold text-[#6F7F65]">
                  Event Details
                </h2>
                <div className="mb-2 flex flex-col sm:flex-row sm:justify-between">
                  <p className="mb-2 font-lora text-[#343a40] sm:mb-0">
                    <span className="font-semibold">Event Name:</span>{' '}
                    {eventData.name || 'N/A'}
                  </p>
                  <p className="font-lora text-[#343a40]">
                    <span className="font-semibold">Date:</span>{' '}
                    {formatDateRange(eventData.startDate, eventData.endDate)}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#6F7F57] text-white">
                      <th className="px-4 py-3 text-left font-croissant">
                        Sub-Event
                      </th>
                      <th className="px-4 py-3 text-left font-croissant">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-croissant">
                        Menu Items
                      </th>
                      <th className="px-4 py-3 text-right font-croissant">
                        Cost (per person)
                      </th>
                      <th className="px-4 py-3 text-right font-croissant">
                        People
                      </th>
                      <th className="px-4 py-3 text-right font-croissant">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedQuatation.map((item, index) => {
                      const maxPeople = Math.max(
                        item.People || 0,
                        item.ActualPeople || 0,
                      );
                      const amount = (item.Cost || 0) * maxPeople;
                      return (
                        <tr
                          key={`subevent-${index}`}
                          className={
                            index % 2 === 0 ? 'bg-[#f7f8f6]' : 'bg-white'
                          }
                        >
                          <td className="px-4 py-3 font-lora text-[#343a40]">
                            {item.SubEventName || 'N/A'}
                          </td>
                          <td className="px-4 py-3 font-lora text-[#343a40]">
                            {formatDateRange(
                              eventData.startDate,
                              eventData.endDate,
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <ul className="list-inside list-disc">
                              {item.Menu.split(', ').map((menuItem, i) => (
                                <li
                                  key={`menu-${i}`}
                                  className="font-lora text-sm text-[#343a40]"
                                >
                                  {menuItem || 'N/A'}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-4 py-3 text-right font-lora text-[#343a40]">
                            ₹{(item.Cost || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-lora text-[#343a40]">
                            {maxPeople}
                          </td>
                          <td className="px-4 py-3 text-right font-lora text-[#343a40]">
                            ₹{amount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 flex flex-col-reverse sm:flex-row">
                <div className="mt-4 w-full sm:mt-0 sm:w-1/2">
                  <div className="rounded-lg bg-[#f1f3ee] p-4">
                    <h3 className="mb-3 font-croissant text-lg font-bold text-[#6F7F65]">
                      Payment Information
                    </h3>
                    <div className="space-y-2">
                      <p className="font-lora text-[#343a40]">
                        <span className="font-semibold">Account Holder:</span>{' '}
                        {paymentData?.data?.AccountHolderName || 'N/A'}
                      </p>
                      <p className="font-lora text-[#343a40]">
                        <span className="font-semibold">Bank Name:</span>{' '}
                        {paymentData?.data?.BankName || 'N/A'}
                      </p>
                      <p className="font-lora text-[#343a40]">
                        <span className="font-semibold">Account Number:</span>{' '}
                        {paymentData?.data?.AccountNo || 'N/A'}
                      </p>
                      <p className="font-lora text-[#343a40]">
                        <span className="font-semibold">IFSC Code:</span>{' '}
                        {paymentData?.data?.IFSC || 'N/A'}
                      </p>

                      <p className="font-lora text-[#343a40]">
                        <span className="font-semibold">UPI ID:</span>{' '}
                        {paymentData?.data?.upi || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full sm:w-1/2 sm:pl-8">
                  <div className="rounded-lg border border-[#e0e0e0] p-4">
                    <h3 className="mb-3 font-croissant text-lg font-bold text-[#6F7F65]">
                      Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="font-lora text-[#343a40]">
                          Sub Total:
                        </span>
                        <span className="font-lora text-[#343a40]">
                          ₹{total.toFixed(2)}
                        </span>
                      </div>

                      {totalExtraCost > 0 && (
                        <div className="flex justify-between">
                          <span className="font-lora text-[#343a40]">
                            Extra Cost:
                          </span>
                          <span className="font-lora text-[#343a40]">
                            ₹{totalExtraCost.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {discountAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="font-lora text-[#343a40]">
                            Discount:
                          </span>
                          <span className="font-lora text-[#343a40]">
                            -₹{discountAmount.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between font-semibold">
                        <span className="font-lora text-[#343a40]">
                          Total Amount:
                        </span>
                        <span className="font-lora text-[#343a40]">
                          ₹{finalTotal.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="font-lora text-[#343a40]">
                          Paid Amount:
                        </span>
                        <span className="font-lora text-[#343a40]">
                          -₹{(eventData.paidAmount || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="my-3 border-t border-[#e0e0e0]"></div>

                      <div className="flex justify-between rounded bg-[#6F7F57] p-2">
                        <span className="font-lora font-bold text-white">
                          Pending Amount:
                        </span>
                        <span className="font-lora font-bold text-white">
                          ₹{pendingAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-[#e0e0e0] pt-4">
                <h3 className="mb-2 font-croissant text-lg font-bold text-[#6F7F65]">
                  Terms & Conditions
                </h3>
                <ul className="list-inside list-disc space-y-1 font-lora text-sm text-[#343a40]">
                  {/* Dynamic terms from API */}
                  {termsResponse?.data?.map((term: any, index: number) => (
                    <li key={`term-${index}`}>{term.terms}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-12 flex justify-end">
                <div className="text-center">
                  <div className="mb-1 h-0.5 w-32 bg-[#6F7F65]"></div>
                  <p className="font-croissant text-[#6F7F65]">
                    Authorized Signature
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <GenericButton
          onClick={handlePrint}
          className="rounded-lg bg-[#009E60] px-8 py-3 text-white transition-colors hover:bg-[#007b4e] focus:outline-none focus:ring-2 focus:ring-[#009E60] focus:ring-opacity-50"
          disabled={loading}
        >
          {loading ? 'Generating PDF...' : 'Download Bill'}
        </GenericButton>
      </div>
    </div>
  );
};

export default ShowBill;
