import {
  useMasterCategoryOptions,
  useMasterColors,
  useMasterSizes,
  useMasterSubcategories,
} from '@/lib/react-query/queriesAndMutations/master';
import {ShopProduct} from '@/types/shopProduct';

const ALL_ACTIVE = {page: 1, limit: 100, active: 'true'} as const;

/**
 * Master data for the product form and list filters, from the shop masters.
 * Sizes / colors already on the product stay pickable even if deactivated.
 */
const useProductMasters = (categoryId?: string, product?: ShopProduct) => {
  const categories = useMasterCategoryOptions();
  const subcategories = useMasterSubcategories({
    ...ALL_ACTIVE,
    sortBy: 'name',
    sortDir: 'asc',
    categoryId: categoryId || undefined,
  });
  const colors = useMasterColors({
    ...ALL_ACTIVE,
    sortBy: 'name',
    sortDir: 'asc',
  });
  const sizes = useMasterSizes({
    ...ALL_ACTIVE,
    sortBy: 'displayOrder',
    sortDir: 'asc',
  });

  // A company's own size / colour hides the standard one with the same name (no "M" twice)
  const preferOwn = <T extends {name: string; isGlobal?: boolean}>(
    rows: T[] = [],
  ) =>
    rows.filter(
      (r) =>
        !r.isGlobal ||
        !rows.some(
          (o) => !o.isGlobal && o.name.toLowerCase() === r.name.toLowerCase(),
        ),
    );
  const merge = <T extends {id: string}>(active: T[] = [], own: T[] = []) => [
    ...active,
    ...own.filter((o) => !active.some((a) => a.id === o.id)),
  ];

  return {
    categories: categories.data ?? [],
    subcategories: subcategories.data?.items ?? [],
    colors: merge(preferOwn(colors.data?.items), product?.colors),
    sizes: merge(preferOwn(sizes.data?.items), product?.sizes),
    loading: {
      categories: categories.isPending,
      subcategories: subcategories.isPending,
      colors: colors.isPending,
      sizes: sizes.isPending,
    },
  };
};

export default useProductMasters;
