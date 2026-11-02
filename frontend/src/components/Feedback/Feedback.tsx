import {usePostFeedback} from '@/lib/react-query/queriesAndMutations/cateror/feedback';
import {Route} from '@/routes/_external/qr.$id';
import {zodResolver} from '@hookform/resolvers/zod';
import {useParams} from '@tanstack/react-router';
import React, {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

const feedbackSchema = z.object({
  // rating: z.number().min(1, 'Feedback is required'),
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

const Feedback = () => {
  const {
    register,
    handleSubmit,
    formState: {errors},
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
  });

  const [showPopup, setShowPopup] = useState(false);
  const [rating, setRating] = useState(0);
  const [hasShownPopup, setHasShownPopup] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const {id: EventId} = Route.useParams();
  console.log('EventId', EventId);

  const {mutate: feedback} = usePostFeedback();

  useEffect(() => {
    // Show the popup after 5 seconds if not already shown
    const timer = setTimeout(() => {
      if (!hasShownPopup) {
        setShowPopup(true);
        setHasShownPopup(true);
      }
    }, 15000); // 5 seconds
    console.log('Timer', timer);
    return () => clearTimeout(timer);
  }, [hasShownPopup]);

  // useEffect(() => {
  //   console.log('Show form changed:', showForm);
  // }, [showForm]);

  const handleRating = (value: number) => {
    console.log('value', value);
    if (value) {
      // feedback(EventId,data);
      setShowForm(true);
    }
    setRating(value);
    setShowPopup(false);
    // You could send feedback to a server here
    console.log('User rated:', value);
  };
  const onSubmit = (data: FeedbackFormData) => {
    console.log('Form submitted:', data);

    feedback({
      subId: EventId,
      data: {
        rating: rating,
        name: data.name,
        phone: data.phoneNumber || '',
        email: data.email || '',
        feedback: data.feedback,
      },
    });
    // alert('Feedback submitted successfully!');
  };

  return (
    <>
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
                  className="material-icons cursor-pointer"
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
            <div className="m-4 flex justify-center">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="material-icons cursor-pointer"
                  // onClick={() => handleRating(i + 1)}
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
    </>
  );
};

export default Feedback;
