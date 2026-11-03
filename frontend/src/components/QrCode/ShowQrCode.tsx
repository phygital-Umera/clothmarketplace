import menucardbg from '@/assets/images/menucard/menucard1.jpg';
import {useGetQrCode} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {usePostFeedback} from '@/lib/react-query/queriesAndMutations/cateror/feedback';
import {Route} from '@/routes/_external/qr.$id';
import {zodResolver} from '@hookform/resolvers/zod';
import React, {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {MdFeedback} from 'react-icons/md';

const feedbackSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phoneNumber: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z
      .string()
      .regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits')
      .optional(),
  ),
  email: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().email('Invalid email address').optional(),
  ),
  feedback: z.string().min(1, 'Feedback is required'),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface Category {
  name: string;
}

interface DishItem {
  dishId: string;
  dish: {
    name: string;
    category: Category;
  };
}

interface User {
  fullname: string;
  email: string;
  phoneNumber: string;
  image?: string;
}

interface EventData {
  name: string;
  client: {
    user: User;
  };
  cateror: {
    user: User;
    image?: string;
  };
}

interface SubeventData {
  name: string;
  time: string;
  address: string;
  date: string;
  dishes: DishItem[];
  event: EventData;
}

const ShowQrCodeData: React.FC = () => {
  const {id} = Route.useParams<{id: string}>();
  const {data: subeventData, isLoading} = useGetQrCode(id);
  const [subevent, setSubevent] = useState<SubeventData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hasShownPopup, setHasShownPopup] = useState(false);

  const {mutate: feedback, isSuccess} = usePostFeedback();

  const {
    register,
    handleSubmit,
    formState: {errors},
  } = useForm<FeedbackFormData>({resolver: zodResolver(feedbackSchema)});

  useEffect(() => {
    if (isLoading) {
      setLoading(true);
      return;
    }

    if (subeventData) {
      setSubevent(subeventData);
    } else {
      setError('No data found');
    }

    setLoading(false);
  }, [subeventData, isLoading]);

  useEffect(() => {
    if (isSuccess) {
      setShowForm(false);
    }
  }, [isSuccess]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasShownPopup) {
        setShowPopup(true);
        setHasShownPopup(true);
      }
    }, 20000);
    return () => clearTimeout(timer);
  }, [hasShownPopup]);

  const handleRating = (value: number) => {
    setRating(value);
    setShowPopup(false);
    setShowForm(true);
  };

  const onSubmit = (data: FeedbackFormData) => {
    feedback({
      subId: id,
      data: {
        rating,
        name: data.name,
        phone: data.phoneNumber || '',
        email: data.email || '',
        feedback: data.feedback,
      },
    });
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="bg-gray-100 flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-700 mt-4 text-lg">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error || !subevent) {
    return (
      <div className="bg-gray-100 flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <p className="text-xl font-medium text-red-600">
            {error || `No data found for ID: ${id}`}
          </p>
        </div>
      </div>
    );
  }

  const cateror = subevent.event.cateror.user;
  const caterorImage = subevent.event.cateror.image;
  const eventDate = new Date(subevent.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const groupedDishes = subevent.dishes.reduce(
    (acc, item) => {
      const categoryName = item.dish.category.name;
      if (!acc[categoryName]) acc[categoryName] = [];
      acc[categoryName].push(item.dish.name);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  return (
    <div className="bg-gray-100 flex min-h-screen items-center justify-center p-4 py-8">
      <div
        style={{
          width: '210mm',
          minHeight: '297mm',
          backgroundImage: `url(${menucardbg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        }}
        className="relative flex flex-col items-center p-8"
      >
        <div className="absolute left-0 right-0 top-0 h-2 bg-gradient-to-r from-teal-500 to-teal-700" />
        <div className="mb-6 flex w-full justify-center">
          <div className="flex items-center justify-center rounded-lg bg-white/20 p-4 backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 overflow-hidden rounded-full">
                <img src={caterorImage} alt="Cateror" />
              </div>
              <h2 className="mt-2 text-xl font-bold text-teal-800">
                {cateror.fullname || 'Your Catering Name'}
              </h2>
              <p className="text-sm text-teal-600">Delicious Experiences</p>
            </div>
          </div>
        </div>

        <div className="mb-8 w-full max-w-2xl rounded-lg p-6 text-graydark backdrop-blur-sm">
          <h4 className="mb-3 text-center text-xl font-semibold">
            Catering Service
          </h4>
          <div className="grid grid-cols-1 gap-4 text-center md:grid-cols-3">
            <div>
              <p className="text-sm font-medium">Contact Name</p>
              <p className="mt-1 text-teal-500">{cateror.fullname}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="mt-1 text-teal-500">{cateror.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Phone</p>
              <p className="mt-1 text-teal-500">{cateror.phoneNumber}</p>
            </div>
          </div>
        </div>

        <h1 className="font-croissant text-5xl font-bold text-teal-800">
          Menu
        </h1>
        <div className="mx-auto my-3 h-1 w-24 bg-teal-600"></div>

        <div className="mt-4 w-full max-w-2xl rounded-lg bg-white/20 p-6 text-center">
          <h2 className="text-gray-800 text-3xl font-semibold">
            {subevent.name}
          </h2>
          <div className="text-gray-600 mt-2 flex justify-center space-x-4 text-sm">
            <p>
              <span className="font-medium">Date:</span> {eventDate}
            </p>
            <p>
              <span className="font-medium">Time:</span>{' '}
              {new Date(subevent.time).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          {subevent.address && (
            <p className="text-gray-600 mt-1 text-sm">
              <span className="font-medium">Location:</span> {subevent.address}
            </p>
          )}
        </div>

        <div className="mt-8 w-full max-w-2xl space-y-8 px-4">
          {Object.entries(groupedDishes).map(([category, dishes], i) => (
            <div
              key={i}
              className="rounded-lg bg-white/10 p-6 shadow-sm backdrop-blur-sm"
            >
              <div className="flex items-center justify-center">
                <div className="h-px flex-1 bg-teal-400"></div>
                <h3 className="mx-4 text-2xl font-semibold uppercase tracking-wider text-teal-700">
                  {category}
                </h3>
                <div className="h-px flex-1 bg-teal-400"></div>
              </div>
              <ul className="mt-4 space-y-2">
                {dishes.map((dish, j) => (
                  <li
                    key={j}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-gray-700 text-lg">{dish}</span>
                    <span className="mx-4 h-px flex-1 bg-teal-100"></span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <button
            className="absolute bottom-6 left-6 z-10 flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-white shadow-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
            onClick={() => setShowForm(true)}
          >
            <MdFeedback className="h-5 w-5" />
            <span className="md:text-md text-xs">Feedback</span>
          </button>
        </div>

        {showPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="rounded bg-white p-6 text-center shadow-md">
              <p className="mb-4 text-lg font-semibold">
                You've been here for a bit — how would you rate us?
              </p>
              <div className="mb-4 flex justify-center">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className="cursor-pointer"
                    onClick={() => handleRating(i + 1)}
                    style={{
                      color: i < rating ? '#ffc107' : '#e4e5e9',
                      fontSize: '32px',
                      margin: '0 4px',
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <button
                className="text-gray-600 mt-2 text-sm underline"
                onClick={() => setShowPopup(false)}
              >
                Later
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              {/* Gradient Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-6 text-center">
                <h2 className="mb-2 text-center text-2xl font-bold text-white">
                  We'd love your feedback!
                </h2>
                <p className="text-sm text-indigo-100">
                  Help us improve by sharing your thoughts
                </p>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5 px-8 py-6"
              >
                <div>
                  <label className="text-gray-700 mb-1 block text-sm font-medium">
                    Name
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className="border-gray-300 w-full rounded-lg px-4 py-2 shadow-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    placeholder="John Doe"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-gray-700 mb-1 block text-sm font-medium">
                    Mobile
                  </label>
                  <input
                    type="text"
                    {...register('phoneNumber')}
                    className="border-gray-300 w-full rounded-lg px-4 py-2 shadow-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    placeholder="+1 (555) 123-4567"
                  />
                  {errors.phoneNumber && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.phoneNumber.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-gray-700 mb-1 block text-sm font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    className="border-gray-300 w-full rounded-lg px-4 py-2 shadow-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    placeholder="you@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-gray-700 mb-1 block text-sm font-medium">
                    Feedback
                  </label>
                  <textarea
                    rows={4}
                    {...register('feedback')}
                    className="border-gray-300 w-full resize-none rounded-lg px-4 py-2 shadow-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    placeholder="Please share your thoughts with us..."
                  />
                  {errors.feedback && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.feedback.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                  >
                    Maybe Later
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2 font-medium text-white shadow-md transition-all hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowQrCodeData;
