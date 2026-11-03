import React from 'react';
import GenericExpandTable from '../Forms/Table/GenericExpandTable';

// Define the structure of the child item (individual raw materials)
interface ChildItem {
  Vendor: string;
  Contact: number;
  Address: string;
  name: string;
}

// Define the structure of the parent item (categories of raw materials)
interface ParentItem {
  categoryName: string;
  children: ChildItem[];
}

// Define the columns for the table
const columns: {header: string; accessor: keyof ChildItem}[] = [
  {header: 'Vendor', accessor: 'Vendor'},
  {header: 'Contact', accessor: 'Contact'},
  {header: 'Address', accessor: 'Address'},
];

// Define the data structure with the ParentItem interface
const data: ParentItem[] = [
  {
    categoryName: 'Raw Material 1',
    children: [
      {
        Vendor: 'Rasmalai',
        Contact: 20,
        Address: 'Address A',
        name: 'vendor A',
      },
      {
        Vendor: 'Gulab Jamun',
        Contact: 30,
        Address: 'Address B',
        name: 'vendor B',
      },
      {
        Vendor: 'Barfi',
        Contact: 25,
        Address: 'Address C',
        name: 'vendor C',
      },
    ],
  },
  {
    categoryName: 'Raw Material 2',
    children: [
      {
        Vendor: 'Peda',
        Contact: 15,
        Address: 'Address D',
        name: 'vendor D',
      },
      {
        Vendor: 'Ladoo',
        Contact: 22,
        Address: 'Address E',
        name: 'vendor E',
      },
      {
        Vendor: 'Jalebi',
        Contact: 28,
        Address: 'Address F',
        name: 'vendor F',
      },
    ],
  },
];

const Rates: React.FunctionComponent = () => {
  return (
    <GenericExpandTable
      data={data}
      columns={columns}
      title="Order Request Rates"
      searchable
    />
  );
};

export default Rates;
