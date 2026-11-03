import React, {useEffect, useState} from 'react';
import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';
import {
  useDeleteRawMaterialCategoryAdmin,
  useGetRawMaterialCategoriesAdmin,
} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';

type RawMaterialCategory = {
  id: string;
  name: string;
  language: string;
};

type Language = {
  id: string;
  name: string;
};

const columns: Column<RawMaterialCategory>[] = [
  {header: 'Raw Material Category Name', accessor: 'name', sortable: true},
  {header: 'Language', accessor: 'language', sortable: true},
];

const DisplayRawMaterialCategory: React.FC = () => {
  const navigate = useNavigate();
  const [rawMaterialCategories, setRawMaterialCategories] = useState<
    RawMaterialCategory[]
  >([]);

  const {
    data: categoriesData,
    isError,
    isSuccess,
    error,
  } = useGetRawMaterialCategoriesAdmin();
  console.log(categoriesData);
  const {data: languagesData} = useGetLanguages();
  const {mutate: deleteRawMaterialCategory} =
    useDeleteRawMaterialCategoryAdmin();

  useEffect(() => {
    if (isSuccess && categoriesData?.data && languagesData) {
      const languageMap = new Map<string, string>(
        languagesData.map((language: Language) => [language.id, language.name]),
      );

      const transformedData = categoriesData.data.map(
        (category: RawMaterialCategory) => ({
          id: category.id,
          name: category.name,
          language: category.language || 'N/A',
        }),
      );

      setRawMaterialCategories(transformedData);
    } else if (isError) {
      console.error(error);
    }
  }, [categoriesData, languagesData, isError, isSuccess, error]);

  const handleEdit = (item: RawMaterialCategory) => {
    navigate({
      to: `/update/rawMaterialCategory/${item.id}`,
    });
  };

  const handleDelete = (item: RawMaterialCategory) => {
    console.log('Delete button clicked for:', item); // Debugging line
    if (
      window.confirm(
        'Are you sure you want to delete this raw material category?',
      )
    ) {
      deleteRawMaterialCategory(item.id, {
        onSuccess: () => {
          setRawMaterialCategories((prev) =>
            prev.filter((category) => category.id !== item.id),
          );
        },
        onError: (err) => {
          console.error('Delete failed with error:', err);
        },
      });
    }
  };

  return (
    <GenericTable
      data={rawMaterialCategories || []}
      columns={columns}
      itemsPerPage={5}
      action
      searchAble
      onDelete={handleDelete}
      onEdit={handleEdit}
    />
  );
};

export default DisplayRawMaterialCategory;
