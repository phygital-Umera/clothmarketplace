import {Link} from '@tanstack/react-router';

const NotFound404: React.FC = () => {
  return (
    <section className="grid min-h-screen place-content-center bg-ivory p-4 text-center">
      <p className="text-label-caps uppercase text-outline">Error 404</p>
      <h1 className="mt-3 font-serif text-display-mobile text-burgundy md:text-display">
        Page not found
      </h1>
      <p className="mx-auto mt-3 max-w-md text-body-md text-on-surface-variant">
        The page you are looking for has moved or never existed.
      </p>
      <Link to="/" className="btn-primary mx-auto mt-8">
        Back to dashboard
      </Link>
    </section>
  );
};

export default NotFound404;
