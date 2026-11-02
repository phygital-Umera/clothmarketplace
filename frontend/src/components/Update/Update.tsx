import React from 'react';
import UpdateVendor from '../Vendor/UpdateVendor';
import UpdateUtensils from '../Utensils/UpdateUtensils';
import UpdateUtensilCategory from '../Utensils/UpdateUtensilCategory';
import UpdateStaff from '../Staff/UpdateStaff';
import UpdateProcess from '../Process/UpdateProcess';
import UpdateMaharaj from '../Maharaj/UpdateMaharaj';
import UpdateInomeExpenditure from '../IncomeExpenditure/UpdateInomeExpenditure';
import UpdateIncomeExpenditureHead from '../IncomeExpenditure/UpdateIncomeExpenditureHead';
import UpdateDisposal from '../Disposal/UpdateDisposal';
import UpdateDish from '../Dish/UpdateDish';
import UpdateDishCategory from '../Dish/UpdateDishCategory';
import UpdateRawMaterial from '../Dish/UpdateRawMaterial';
import UpdateRawMaterialCategory from '../Dish/UpdateRawMaterialCategory';
import UpdateCateror from '../Caterer/UpdateCateror';
import {Route} from '@/routes/_app/_edit/update.$name.$id';
import UpdateDisposalCategory from '../Disposal/UpdateDisposalCategory';
import UpdateProcessCateror from '../Process/UpdateProcessCateror';
import UpdateDishCategoryCateror from '../Dish/UpdateDishCategoryCateror';
import UpdateRawMaterialCateror from '../Dish/UpdateRawMaterialCateror';
import UpdateRawMaterialCategoryCateror from '../Dish/UpdateRawMaterialCategoryCateror';
import UpdateUtensilsCat from '../CaterorUtensils/UpdateUtensilsCat';
import UpdateUtensilCategoryCat from '../CaterorUtensils/UpdateUtensilCategory';
import UpdateDisposalCat from '../CaterorDisposal/UpdateDisposalCat';
import UpdateDisposalCategoryCat from '../CaterorDisposal/UpdateDisposalCategoryCat';
import UpdateDishCat from '../Dish/UpdateDishCat';
import UpdateClient from '../client/UpdateClient';

const componentMap: Record<string, React.ElementType> = {
  cateror: UpdateCateror,
  vendor: UpdateVendor,
  utensils: UpdateUtensils,
  utensilCategory: UpdateUtensilCategory,
  staff: UpdateStaff,
  process: UpdateProcess,
  maharaj: UpdateMaharaj,
  incomeExpenditure: UpdateInomeExpenditure,
  incomeExpenditureHead: UpdateIncomeExpenditureHead,
  disposal: UpdateDisposal,
  disposalcategory: UpdateDisposalCategory,
  dish: UpdateDish,
  dishcat: UpdateDishCat,
  dishCategory: UpdateDishCategory,
  rawMaterial: UpdateRawMaterial,
  rawMaterialCategory: UpdateRawMaterialCategory,
  processCateror: UpdateProcessCateror,
  dishCategoryCateror: UpdateDishCategoryCateror,
  rawMaterialCateror: UpdateRawMaterialCateror,
  rawMaterialCategoryCateror: UpdateRawMaterialCategoryCateror,
  utensilsCateror: UpdateUtensilsCat,
  utensilCategoryCateror: UpdateUtensilCategoryCat,
  disposalCateror: UpdateDisposalCat,
  disposalcategoryCateror: UpdateDisposalCategoryCat,
  client: UpdateClient,
};

const Update: React.FC = () => {
  const {id, name} = Route.useParams();
  const Component = componentMap[name];

  return (
    <div>
      {Component ? (
        <Component id={id} />
      ) : (
        <p>Component not found for: {name}</p>
      )}
    </div>
  );
};

export default Update;
