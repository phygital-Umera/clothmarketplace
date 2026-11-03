import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {useGetDisposalCategories} from '@/lib/react-query/queriesAndMutations/admin/disposal';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import {useNavigate} from '@tanstack/react-router';
import {useEffect, useState} from 'react';
import {useDeleteDisposalCategory} from '@/lib/react-query/queriesAndMutations/admin/disposal';

type DisposalCategory = {
  id: string;
  CategoryName: string;
  Language: string;
};

type Language = {
  id: string; // or number, depending on your data structure
  name: string;
};

// interface Category {
//   id: string; // or number, depending on your data structure
//   name: string;
//   languageId: string; // or number, depending on your data structure
// }
type Category = {
  id: string; // or number, depending on your data structure
  name: string;
  languageId: string; // or number
};

const columns: Column<DisposalCategory>[] = [
  {header: 'Disposal Category', accessor: 'CategoryName', sortable: true},
  {header: 'Language', accessor: 'Language', sortable: true},
];

const DisplayDisposalCategory: React.FC = () => {
  const navigate = useNavigate();
  const [disposalCategories, setDisposalCategories] = useState<
    DisposalCategory[]
  >([]);
  const {
    data: categoriesData,
    isError,
    isSuccess,
    error,
  } = useGetDisposalCategories();

  const {data: languagesData} = useGetLanguages();
  const {mutate: deleteDisposalCategory} = useDeleteDisposalCategory();

  useEffect(() => {
    if (isSuccess && categoriesData.data && languagesData) {
      const languageMap = new Map<string, string>(
        languagesData.map((language: Language) => [language.id, language.name]),
      );

      const transformedData = categoriesData.data.data.map(
        (category: Category) => ({
          id: category.id,
          CategoryName: category.name,
          Language: languageMap.get(category.languageId) || 'N/A',
        }),
      );

      setDisposalCategories(transformedData);
      console.log(transformedData);
    } else if (isError) {
      console.error(error);
    }
  }, [categoriesData, languagesData, isError, isSuccess, error]);

  const handleEdit = (item: DisposalCategory) => {
    navigate({
      to: `/update/disposalcategory/${item.id}`,
    });
  };

  const handleDelete = (item: DisposalCategory) => {
    if (
      window.confirm('Are you sure you want to delete this disposal category?')
    ) {
      deleteDisposalCategory(item.id, {
        onSuccess: () => {
          setDisposalCategories((prev) =>
            prev.filter((category) => category.id !== item.id),
          );
        },
      });
    }
  };

  return (
    <GenericTable
      data={disposalCategories}
      columns={columns}
      itemsPerPage={5}
      action
      onDelete={handleDelete} // Integrating the delete handler
      onEdit={handleEdit}
    />
  );
};

export default DisplayDisposalCategory;
