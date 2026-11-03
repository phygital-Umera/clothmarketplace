import {z} from 'zod';

const eventValidationSchema = z.object({
  EventName: z
    .string({required_error: 'EventName is required'})
    .min(2, {message: 'EventName must be at least 2 characters long'}),
  StartDate: z.string({required_error: 'StartDate is required'}),
  EndDate: z.string({required_error: 'EndDate is required'}),
});

const eventIdValidation = z.object({
  EventID: z.string({required_error: 'EventID is required'}),
});

const subEventValidationSchema = z.object({
  Event: z.string({required_error: 'Please select a event'}),
  SubEventName: z
    .string({required_error: 'SubEventName is required'})
    .min(2, {message: 'SubEventName must be at least 2 characters long'}),
  Description: z.string({required_error: 'Description is required'}),
  Address: z.string({required_error: 'Address is required'}),
  StartDate: z.string({required_error: 'StartDate is required'}),
  EndDate: z.string({required_error: 'EndDate is required'}),
  ExpectedPeople: z
    .number({required_error: 'ExpectedPeople is required'})
    .min(1, {message: 'ExpectedPeople must be at least 1'}),
});

const subEventMaharajValidation = z.object({
  EventID: z
    .string({required_error: 'maharaj name is required'})
    .min(2, {message: 'EventName must be at least 2 characters long'}),
  SubEventID: z.string({required_error: 'sub event name is required'}),
  MaharajID: z
    .string({required_error: 'maharaj name is required'})
    .min(2, {message: 'maharaj name must be at least 2 characters long'}),
});

const EventAndSubEventValidation = z.object({
  EventID: z
    .string({required_error: 'maharaj name is required'})
    .min(2, {message: 'EventName must be at least 2 characters long'}),
  SubEventID: z.string({required_error: 'sub event name is required'}),
});

const dishSubEventValidation = z.object({
  caterorDishID: z
    .string({required_error: 'caterorDishID is required'})
    .min(2, {message: 'caterorDishID must be at least 2 characters long'}),

  discountPercentage: z
    .number()
    .min(0, {message: 'Discount percentage cannot be negative'})
    .max(100, {message: 'Discount percentage cannot exceed 100%'})
    .optional(),

  peopleCount: z
    .number()
    .min(1, {message: 'People count must be at least 1'})
    .optional(),

  quantity: z
    .number({message: 'Quantity must be a positive number'})
    .optional(),
});

const StaffIdValidation = z.object({
  StaffID: z
    .string({required_error: 'Staff name is required'})
    .min(2, {message: 'EventName must be at least 2 characters long'}),
});

// staff sub event schemas

const StaffSubEventValidation =
  EventAndSubEventValidation.merge(StaffIdValidation);

const ProcessIdValidation = z.object({
  ProcessID: z
    .string({required_error: 'Staff name is required'})
    .min(2, {message: 'EventName must be at least 2 characters long'}),
});

const ProcessSubEventValidation =
  EventAndSubEventValidation.merge(ProcessIdValidation);

// disposal schema validation

// const eventDisposalSchema = z.object({
//   EventID: z.string().uuid({message: 'EventID must be a valid UUID'}),
//   DisposalID: z.string().uuid({message: 'DisposalID must be a valid UUID'}),
//   takenQuantity: z
//     .number()
//     .min(1, {message: 'takenQuantity must be at least 1'}),
// });

const CreateEventSchema = z.object({
  ClientName: z.string({required_error: 'client name is rquired'}),
  Mobile1: z
    .string({required_error: 'Mobile no. is rquired'})
    .min(10, {message: 'mobile no must be of 10 digit'}),
  Mobile2: z
    .string({required_error: 'Mobile no. is rquired'})
    .min(10, {message: 'mobile no must be of 10 digit'})
    .optional(),
  ResidentialAddress: z
    .string({required_error: 'residential address is rquired'})
    .min(2, {
      message: 'residential address should be atleast 2 characters long',
    }),
  EventAddress: z
    .string({required_error: 'Event address is rquired'})
    .min(2, {message: 'Event address should be atleast 2 characters long'}),
  Caste: z.string({required_error: 'Event address is rquired'}),
});

const DishSelectionSchema = z.object({
  selectedDishes: z
    .record(
      z.string(), // Category name as the key (string)
      z.array(z.string().min(1, 'Dish ID is required')), // List of selected dish IDs
    )
    .optional(),
});

const CreateSubEventSchema = z.object({
  subEventName: z.string().min(1, 'Sub Event Name is required'),
  subEventAddress: z.string().optional(),
  expectedPeople: z
    .string()
    .min(1, 'Expected People is required')
    .transform((value) => parseInt(value, 10))
    .refine((value) => !isNaN(value) && value > 0, {
      message: 'Expected People must be a positive number',
    }),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  manpower: z
    .string()
    .max(6, 'Manpower must be at most 6 characters')
    .optional(),
  waiter: z.string().max(6, 'Waiter must be at most 6 characters').optional(),
  waitress: z
    .string()
    .max(6, 'Waitress must be at most 6 characters')
    .optional(),
  washers: z.string().max(6, 'Washers must be at most 6 characters').optional(),
  cooks: z.string().max(6, 'Cooks must be at most 6 characters').optional(),
  helpers: z.string().max(6, 'Helpers must be at most 6 characters').optional(),
  dishes: DishSelectionSchema,
});

const subEventDishSchema = z.object({
  dishId: z.string().min(1, 'Dish Id is Required'),
});

const dateInFuture = (message: string) =>
  z.coerce.date().refine((date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return date >= now;
  }, message);

const subEventSchema = z.object({
  name: z.string().optional(),
  expectedPeople: z.string().min(1, 'Expected People is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  address: z.string().optional(),
  eventId: z.string().optional(),
  dishes: subEventDishSchema.array().optional(),
});

// Event Utensils Schema

const eventUtensilSchema = z.object({
  utensilId: z.string().min(1, 'Utensil ID is required'),
  taken: z.number().int().min(0),
  returned: z.number().int().min(0),
  fetchedReturned: z.number().int().min(0),
  updateReturned: z.number().int().min(0),
});

const addUtensilToEventSchema = eventUtensilSchema.omit({returned: true});

const bulkAddUtensilToEventSchema = z.object({
  eventId: z.string().min(1, 'Event Id is required'),
  utensils: addUtensilToEventSchema.array(),
});

const bulkReturnUtensilToEventSchema = z.object({
  eventId: z.string().min(1, 'Event Id is required'),
  utensils: eventUtensilSchema.array(),
});

// Event Disposal Schema
const eventDisposalSchema = z.object({
  disposalId: z.string().min(1, 'Disposal ID is required'),
  taken: z.number().int().min(0),
  returned: z.number().int().min(0),
  fetchedReturned: z.number().int().min(0),
  updateReturned: z.number().int().min(0),
});

const addDisposalToEventSchema = eventDisposalSchema.omit({returned: true});

const bulkAddDisposalToEventSchema = z.object({
  eventId: z.string().min(1, 'Event Id is required'),
  disposals: addDisposalToEventSchema.array(),
});

const bulkReturnDisposalToEventSchema = z.object({
  eventId: z.string().min(1, 'Event Id is required'),
  disposals: eventDisposalSchema.array(),
});
// Event Dish Wastage Schema

const eventDishWastageSchema = z.object({
  categoryId: z.string().min(1, 'Category Id is required'),
  dishId: z.string().min(1, 'Dish Id is required'),
  quantity: z.number().default(0),
  measurement: z.enum(['kg', 'gm', 'ml', 'ltr']),
});

const bulkAddDishWastageSchema = z.object({
  subeventId: z.string().min(1, ' SubEventId is required'),
  wastages: eventDishWastageSchema.array(),
});

// after event people checking

const subEventPeople = z.object({
  subEventId: z.string().min(1, 'Sub Event Id is required'),
  dishId: z.string().min(1, 'Dish Id is required'),
  expectedPeople: z.number().default(0),
  actualPeople: z.number().default(0),
  updateActualPeople: z.number().default(0),
  fetchedActualPeople: z.number().default(0),
});

const eventPeopleValidationSchema = z.object({
  eventId: z.string().min(1, 'Event Id is required'),
  subEventPeople: subEventPeople.array(),
});

const rawMaterialWithQuantityAndPriceSchema = z.object({
  rawMaterialId: z.string().optional(),
  quantity: z.number(),
  processId: z.string().optional(),
});

const SubEventDishRawMaterial = z.object({
  dishId: z.string().min(1, 'Dish Id is required'),
  maharajId: z.string().min(1, 'MaharajId is required'),
  people: z
    .string()
    .transform((v) => parseFloat(v))
    .optional(),
  price: z
    .string()
    .transform((v) => parseFloat(v))
    .optional(),
  kg: z
    .string()
    .transform((v) => parseFloat(v))
    .optional(),
  rawMaterials: rawMaterialWithQuantityAndPriceSchema.array().optional(),
});

const SubEventRawMaterialListValidation = z.object({
  subEventId: z.string().min(1, 'SubEventId is required'),
  preparationPeople: z.number().min(1, 'Minimum 1 people is required'),
  dishes: SubEventDishRawMaterial.array(),
});

const RateCalculatorSchema = z.object({
  subEvents: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      rawMaterial: z.number().min(0, 'Raw material must be positive'),
      labor: z.object({
        cooks: z.object({
          count: z.number().min(0, 'Count must be positive'),
          price: z.number().min(0, 'Price must be positive'),
        }),
        helpers: z.object({
          count: z.number().min(0, 'Count must be positive'),
          price: z.number().min(0, 'Price must be positive'),
        }),
        waiters: z.object({
          count: z.number().min(0, 'Count must be positive'),
          price: z.number().min(0, 'Price must be positive'),
        }),
        femaleWaiters: z.object({
          count: z.number().min(0, 'Count must be positive'),
          price: z.number().min(0, 'Price must be positive'),
        }),
        washers: z.object({
          count: z.number().min(0, 'Count must be positive'),
          price: z.number().min(0, 'Price must be positive'),
        }),
        others: z.object({
          count: z.number().min(0, 'Count must be positive'),
          price: z.number().min(0, 'Price must be positive'),
        }),
      }),
      // extras: z.array(
      //   z.object({
      //     name: z.string().min(1, 'Name is required'),
      //     price: z.number().min(0, 'Price must be positive'),
      //   }),
      // ),
      profit: z.number().min(0, 'Profit must be positive'),
    }),
  ),
});

// Define the TypeScript type based on the schema
export {
  // event utenisls
  addUtensilToEventSchema,
  bulkAddDishWastageSchema,
  bulkAddUtensilToEventSchema,
  bulkReturnUtensilToEventSchema,
  CreateEventSchema,
  CreateSubEventSchema,
  dishSubEventValidation,
  EventAndSubEventValidation,
  eventDisposalSchema,
  eventIdValidation,
  eventPeopleValidationSchema,
  eventUtensilSchema,
  eventValidationSchema,
  ProcessSubEventValidation,
  rawMaterialWithQuantityAndPriceSchema,
  StaffSubEventValidation,
  subEventMaharajValidation,
  // sub event
  RateCalculatorSchema,
  SubEventRawMaterialListValidation,
  subEventSchema,
  subEventValidationSchema,
  // eventDisposalSchema,
  bulkAddDisposalToEventSchema,
  bulkReturnDisposalToEventSchema,
};
