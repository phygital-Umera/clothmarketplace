export enum AUTH_KEYS {
  GET_CURRENT_USER = 'getCurrentUser',
}

export enum QUERY_KEYS {
  TOKEN = 'token',
  GET_ALL_CATERORS = 'caterors',
  SEARCH_CATERORS = 'search-caterors',
  GET_CATEROR_BY_ID = 'cateror',
}

export enum RAW_MATERIALS_QUERY_KEYS {
  GET_ALL_RAW_MATERIALS = 'raw-materials',
  GET_RAW_MATERIAL_BY_ID = 'raw-material',
}

export enum DISH_CATEGORIES_QUERY_KEYS {
  GET_ALL_DISH_CATEGORIES = 'dish-categories',
  GET_DISH_CATEGORY_BY_ID = 'dish-category',
}

export enum DISHES_QUERY_KEYS {
  GET_ALL_DISHES = 'dishes',
  GET_DISH_BY_ID = 'dish',
}

export enum QUATATION_KEYS {
  GET_QUATATION = 'getQuatation',
}

export enum BILL_KEYS {
  GET_BILL = 'getBill',
}

export enum DISH_AND_RAW_MATERIAL_QUERY_KEYS {
  GET_ALL_RAW_MATERIALS = 'raw-materials',
  SEARCH_RAW_MATERIALS = 'search-raw-materials',
  GET_RAW_MATERIAL_BY_ID = 'raw-material',

  GET_ALL_DISH_CATEGORIES = 'dish-categories',
  SEARCH_DISH_CATEGORIES = 'search-dish-categories',
  GET_DISH_CATEGORY_BY_ID = 'dish-category',
  GET_ALL_DISHES = 'dishes',
  SEARCH_DISHES = 'search-dishes',
  GET_DISH_BY_ID = 'dish',
}

export enum MAHARAJ_KEYS {
  SEARCH_MAHARAJS = 'search-maharajs',
  GET_MAHARAJ_BY_ID = 'maharaj',
  GET_ALL_MAHARAJS = 'maharajs',
}

export enum CLIENT_KEYS {
  SEARCH_CLIENT = 'search-clients',
  GET_CLIENT_BY_ID = 'client',
  GET_ALL_CLIENT = 'clients',
}

export enum STAFF_KEYS {
  SEARCH_STAFF = 'search-Staffs',
  GET_STAFF_BY_ID = 'staff',
  GET_ALL_STAFFS = 'staffs',
}

export enum EVENT_KEYS {
  GET_ALL_EVENTS = 'events',
  SEARCH_EVENTS = 'search-events',
  GET_EVENT_BY_ID = 'event',

  GET_ALL_SUBEVENTS = 'subevents',
  GET_SUBEVENT_BY_ID = 'subevent',
  GET_ALL_DISH_CATEGORIES_WITH_DISHES = 'dishCategoriesWithDishes',
}

export enum EVENT_RAW_MATERIAL {
  GET_ALL_EVENT_RAW_MATERIAL = 'GetAllRawMaterialFromEvent',
}

export enum PROCESS_KEYS {
  SEARCH_PROCESS = 'search-Proccess',
  GET_PROCESS_BY_ID = 'Process',
  GET_ALL_PROCESSES = 'Processes',
}

export enum UTENSIL_CATEGORY_KEYS {
  GET_ALL_UTENSIL_CATEGORIES = 'getAllUtensilCategories',
  SEARCH_UTENSIL_CATEGORIES = 'searchUtensilCategories',
  GET_UTENSIL_CATEGORY_BY_ID = 'getUtensilCategoryById',
}

export enum UTENSIL_KEYS {
  GET_ALL_UTENSILS = 'getAllUtensils',
  SEARCH_UTENSILS = 'searchUtensils',
  GET_UTENSIL_BY_ID = 'getUtensilById',
}

export enum DISPOSAL_CATEGORY_KEYS {
  GET_ALL_DISPOSAL_CATEGORIES = 'getAllDisposalCategories',
  SEARCH_DISPOSAL_CATEGORIES = 'searchDisposalCategories',
  GET_DISPOSAL_CATEGORY_BY_ID = 'getDisposalCategoryById',
}

export enum DISPOSAL_KEYS {
  GET_ALL_DISPOSALS = 'getAllDisposals',
  SEARCH_DISPOSALS = 'searchDisposals',
  GET_DISPOSAL_BY_ID = 'getDisposalById',
}

// event disposal query key

export enum EVENT_DISPOSAL_KEYS {
  GET_ALL_EVENT_DISPOSAL = 'getAllEventDisposal',
  SEARCH_EVENT_DISPOSAL = 'searchEventDisposal',
  GET_EVENT_DISPOSAL_BY_ID = 'getEventDisposalById',
}

export enum EVENT_UTENSIL_KEYS {
  GET_ALL_EVENT_UTENSIL = 'getAllEventUtensil',
  SEARCH_EVENT_UTENSIL = 'searchEventUtensil',
  GET_EVENT_UTENSIL_BY_ID = 'getEventUtensilById',
}

export enum SUBSCRIPTION_KEYS {
  GET_ALL_SUBSCRIPTIONS = 'getAllSubscriptions',
  SEARCH_SUBSCRIPTIONS = 'searchSubscriptions',
  GET_SUBSCRIPTION_BY_ID = 'getSubscriptionById',
}

// cateror dish & dish raw material

export enum CATEROR_DISH_CATEGORY {
  GET_ALL_CATEROR_DISH_CATEGORY = 'getAllCaterorDishCategory',
}
export enum CATEROR_DISH {
  GET_ALL_CATEROR_DISH = 'getAllCaterorDish',
  SEARCH_CATEROR_DISH = 'searchCaterorDish',
  GET_CATEROR_DISH_BY_ID = 'getCaterorDishById',
}

export enum CATEROR_DISH_RAW_MATERIAL {
  GET_ALL_CATEROR_DISH_RAW_MATERIAL = 'getAllCaterorDishRawMaterial',
  SEARCH_CATEROR_DISH_RAW_MATERIAL = 'searchCaterorDishRawMaterial',
  GET_CATEROR_DISH_RAW_MATERIAL_BY_ID = 'getCaterorDishRawMaterialById',
}

export const TRANSACTION_KEYS = {
  GET_ALL_TRANSACTIONS: 'getAllTransactions',
  GET_TRANSACTION_BY_ID: 'getTransactionById',
  SEARCH_TRANSACTIONS: 'searchTransactions',
  SEARCH_TRANSACTIONS_BY_TYPE: 'searchTransactionsByType',
};

//**  Admin query keys  */

export const ADMIN_CATEROR_QUERY_KEYS = {
  CATERORS: 'caterors',
  CATEROR: 'cateror',
  TOKEN: 'authToken',
};

export const ADMIN_DISH_QUERY_KEYS = {
  DISH_CATEGORIES: 'dishCategories',
  DISH_CATEGORY: 'dishCategory',
  DISHES: 'dishes',
  DISH: 'dish',
  RAW_MATERIAL_CATEGORIES: 'rawMaterialCategories',
  RAW_MATERIAL_CATEGORY: 'rawMaterialCategory',
  RAW_MATERIALS: 'rawMaterials',
  RAW_MATERIAL: 'rawMaterial',
};

export const ADMIN_DISPOSAL_QUERY_KEYS = {
  DISPOSAL_CATEGORIES: 'disposalCategories',
  DISPOSAL_CATEGORY: 'disposalCategory',
  DISPOSALS: 'disposals',
  DISPOSAL: 'disposal',
};

export const CATEROR_DISPOSAL_QUERY_KEYS = {
  DISPOSAL_CATEGORIES: 'disposalCategories',
  DISPOSAL_CATEGORY: 'disposalCategory',
  DISPOSALS: 'disposals',
  DISPOSAL: 'disposal',
};

export const ADMIN_LANGUAGE_QUERY_KEYS = {
  LANGUAGES: 'languages',
};

export const ADMIN_PROCESS_QUERY_KEYS = {
  PROCESSES: 'processes',
  PROCESS: 'process',
};

export const ADMIN_UTENSIL_QUERY_KEYS = {
  UTENSILCATEGORIES: 'utensilcategories',
  UTENSILS: 'utensils',
};

//**  cateror query keys  */

export const CATEROR_DISH_QUERY_KEYS = {
  DISH_CATEGORIES: 'dishCategories',
  DISHES: 'dishes',
  DISH: 'dish',
  RAW_MATERIAL_CATEGORY_CATEROR: 'rawMaterialCategoryCat',
  RAW_MATERIAL_CATEROR: 'rawMaterialCateror',
};

export enum CATEROR_CLIENT_KEYS {
  SEARCH_CLIENT = 'search-clients',
  GET_CLIENT_BY_ID = 'client',
  GET_ALL_CLIENT = 'clients',
}

export enum CATEROR_DISPOSAL_CATEGORY_KEYS {
  GET_ALL_DISPOSAL_CATEGORIES = 'getAllDisposalCategories',
  SEARCH_DISPOSAL_CATEGORIES = 'searchDisposalCategories',
  GET_DISPOSAL_CATEGORY_BY_ID = 'getDisposalCategoryById',
}

export enum CATEROR_DISPOSAL_KEYS {
  GET_ALL_DISPOSALS = 'getAllDisposals',
  SEARCH_DISPOSALS = 'searchDisposals',
  GET_DISPOSAL_BY_ID = 'getDisposalById',
}

export enum CATEROR_MAHARAJ_KEYS {
  SEARCH_MAHARAJS = 'search-maharajs',
  GET_MAHARAJ_BY_ID = 'maharaj',
  GET_ALL_MAHARAJS = 'maharajs',
}

export const CATEROR_PROCESS_QUERY_KEYS = {
  PROCESSES: 'processes',
  PROCESS: 'process',
};

export const INCOME_EXPENSE_KEYS = {
  GET_INCOME_EXPENSES: 'incomeexpense',
  GET_INCOME_EXPENSE_BY_ID: 'IncomeExpensebyId',
};

export enum CATEROR_STAFF_KEYS {
  SEARCH_STAFF = 'search-Staffs',
  GET_STAFF_BY_ID = 'staff',
  GET_ALL_STAFFS = 'staffs',
}

export const CATEROR_UTENSIL_QUERY_KEYS = {
  UTENSILCATEGORIES: 'utensilcategories',
  UTENSILCATEGORY: 'utensilcategories',
  UTENSILS: 'utensils',
  UTENSIL: 'utensil',
};

export const CATEROR_VENDOR_QUERY_KEYS = {
  VENDORS: 'vendors',
  VENDOR: 'vendor',
};

export const NOTIFICATION_QUERY_KEYS = {
  GET_NOTIFICATION: 'getAllNotification',
};
export const NOTIFICATIONBYID_QUERY_KEYS = {
  GET_NOTIFICATION_BY_ID: 'getNotificationById',
};

export const CATEROR_DISH_RAW_MATERIAL_QUERY_KEYS = {
  GET_ALL_CATEROR_DISH_RAW_MATERIAL: 'getAllCaterorDishRawMaterial',
  SEARCH_CATEROR_DISH_RAW_MATERIAL: 'searchCaterorDishRawMaterial',
  GET_CATEROR_DISH_RAW_MATERIAL_BY_ID: 'getCaterorDishRawMaterialById',
};

export const CATEROR_PRIORITY_QUERY_KEYS = {
  PRIORITIES: 'priorities',
  PRIORITY: 'priority',
};

export const ADMIN_PRIORITY_QUERY_KEYS = {
  PRIORITIES: 'priorities',
  PRIORITY: 'priority',
};

export const COMPANY_KEYS = {
  COMPANIES: 'companies',
  COMPANY: 'company',
  PINCODE: 'pincode',
};
