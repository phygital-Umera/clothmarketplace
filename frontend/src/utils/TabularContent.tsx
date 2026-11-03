// TabularContent.tsx
import React from 'react';

interface DataRow {
  id: number;
  name: string;
  age: number;
}

const sampleData: DataRow[] = [
  {id: 1, name: 'Alice', age: 30},
  {id: 2, name: 'Bob', age: 25},
  {id: 3, name: 'Charlie', age: 28},
];

const TabularContent: React.FC = () => {
  return (
    <table className="border-gray-200 min-w-full border-collapse border">
      <thead>
        <tr className="bg-gray-100">
          <th className="border-gray-300 border px-4 py-2">ID</th>
          <th className="border-gray-300 border px-4 py-2">Name</th>
          <th className="border-gray-300 border px-4 py-2">Age</th>
        </tr>
      </thead>
      <tbody>
        {sampleData.map((row) => (
          <tr key={row.id}>
            <td className="border-gray-300 border px-4 py-2 text-center">
              {row.id}
            </td>
            <td className="border-gray-300 border px-4 py-2">{row.name}</td>
            <td className="border-gray-300 border px-4 py-2 text-center">
              {row.age}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TabularContent;
