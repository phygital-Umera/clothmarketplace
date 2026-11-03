import {Company} from '@/types/company';

const sizes = {
  sm: 'h-10 w-10 text-technical-data',
  lg: 'h-16 w-16 text-subheading',
};

// Logo in a hairline frame, or a circular monogram when there is no logo
const CompanyAvatar = ({
  company,
  size = 'sm',
}: {
  company: Pick<Company, 'name' | 'logo'>;
  size?: keyof typeof sizes;
}) =>
  company.logo ? (
    <img
      src={company.logo}
      alt=""
      className={`${sizes[size]} shrink-0 border border-ivory-300 bg-white object-contain p-1`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full border border-hairline bg-ivory-200 font-serif text-burgundy`}
    >
      {company.name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()}
    </span>
  );

export default CompanyAvatar;
