import React, {useState} from 'react';
import {FaTimes} from 'react-icons/fa'; // Import close icon from react-icons
import Loader from '../common/Loader';
import {format} from 'date-fns';

interface PopupProps {
  onClose: () => void;
  daysRemaining: number | null; // Add daysRemaining as a prop
  expiryDate: string | null; // Add expiryDate as a prop
}

const ExpiryPopup: React.FC<PopupProps> = ({
  onClose,
  daysRemaining,
  expiryDate,
}) => {
  const [isModalVisible, setModalVisible] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleClose = () => {
    setModalVisible(false);
    onClose();
  };

  if (isLoading) {
    return <Loader />; // Show loader while loading
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      {isModalVisible && (
        <div className="relative w-full max-w-2xl rounded-lg bg-white p-8">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 absolute right-4 top-4 focus:outline-none"
          >
            <FaTimes className="h-2.5 w-2.5" />
          </button>

          {/* Heading */}
          <h2 className="mb-6 text-center text-3xl font-extrabold text-black">
            Catering Plan Expiry
          </h2>

          {/* Expiry Message */}
          <p className="text-gray-700 text-center text-lg">
            ⏳ Your catering plan will expire on{' '}
            <span className="font-bold text-red-600">
              {expiryDate ? format(new Date(expiryDate), 'MMM d, yyyy') : 'N/A'}
            </span>
            . Renew your plan now to continue enjoying uninterrupted services
            and benefits. Don’t miss out!
          </p>
        </div>
      )}
    </div>
  );
};

export default ExpiryPopup;
