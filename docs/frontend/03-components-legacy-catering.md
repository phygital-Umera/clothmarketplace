# Legacy catering components (`frontend/src/components/`)

Audience: beginners. This page covers 16 folders inside `frontend/src/components/` that belong to an older **catering-management app**, not to the cloth marketplace / shop POS. Nothing in the source was changed to write this page.

## 1. Short answer

**None of these 16 folders is used by the current app.** They are dead code left over from an earlier project. Evidence:

| Check | What was found |
|---|---|
| How pages are wired | The app uses TanStack Router file routes in `frontend/src/routes/_app/...` (about 80 `*.lazy.tsx` files such as `shop-admin/new-bill`, `super-admin/companies`). Each route renders a component from `frontend/src/pages/`. `src/App.tsx` and `src/main.tsx` only start the router. |
| Does any route, page, `App.tsx` or layout import these folders? | **No.** A search of all of `src/` for imports of each folder found importers only inside the same group of legacy folders (see section 3). |
| The one outside "doorway" | `components/Update/Update.tsx` imports about 20 of the legacy components. But nothing imports `Update.tsx` itself, and it imports a route file `@/routes/_app/_edit/update.$name.$id` that **does not exist**. So it is dead too. |
| The other doorway | `components/common/Calendar.tsx` imports `Event/EventModal` and `Event/UpdateEventModal`. `Calendar` is exported from `components/common/index.ts`, but nothing imports `Calendar` or that index file (other files use e.g. `common/Pagination` directly). Also dead. |
| Broken imports | The legacy files import data hooks from `@/lib/react-query/queriesAndMutations/admin/*` (dish, disposal, languages, process, utensils, cateror) and `.../cateror/*` (client, dish, event, maharaj, vendor, quatation, ...). **Those folders do not exist** (only `notification.ts` of the imported files exists). So these files cannot compile today, which also means they cannot be part of a working build. |
| Git history | `components/Event` was added in the single "Initial commit" and never touched again. |

Note: `tsconfig.app.json` still includes `src/` wholesale, so type-checking would report errors from these files. Vite only bundles files reachable from `main.tsx`, so the build itself ignores them.

## 2. What the old catering module did (plain language)

Imagine a company that cooks food for weddings and parties (a "caterer"). Its software let staff:

1. **Set up master lists**: dishes and dish categories, raw materials (rice, oil, ...) and their categories, utensils, disposables (plates, cups), cooking processes, languages (dish names in several languages), priorities (order of categories on the menu), vendors (suppliers), "Maharaj" (head cooks), and income/expense heads.
2. **Define recipes**: for each dish, how many kg of each raw material are needed per N people.
3. **Create events**: a client books an event; an event is split into **sub-events** (e.g. lunch, dinner) each with a menu and an expected number of people.
4. **Work out purchasing**: add up raw material needed, get vendor rates (vendors could even open a shareable external link to enter prices), and print raw-material order reports.
5. **Money**: create a **quotation**, then a **bill**; show bank/payment details and terms and conditions; track income and expenses per event.
6. **After the event**: check guest count, utensils returned, leftover raw material, dish wastage, and produce a wastage report.
7. **Settings and notifications**: caterer profile, manpower, payment details, terms, and alerts when new dishes are added.

The cloth marketplace does not need any of this.

## 3. How the legacy files connect to each other

| Group | Imports from |
|---|---|
| `Event/EventManagement.tsx` | `Quatation/*` and `IncomeExpenditure/*` |
| `Quatation/Quatation.tsx` | `Event/*` |
| `Update/Update.tsx` (outside scope, also dead) | Vendor, Utensils, Process, Maharaj, IncomeExpenditure, Disposal, Dish, Caterer, CaterorUtensils, CaterorDisposal (and `Staff`, `client`) |
| `common/Calendar.tsx` (dead) | `Event/EventModal`, `Event/UpdateEventModal` |
| Everything else | Shared generic form/table widgets (`components/Forms/*`) and the missing data hooks |

Folders with **no importer at all** (not even from another legacy file): `CaterorSetting`, `Language`, `NotificatioinDishes`, `Priority`.

## 4. Per-folder file tables

Column "Used in current app?" means: reachable from `main.tsx` via routes/pages. For every file below the answer is **No**. The "Purpose" column is based on the file name, the form labels and the data hooks it calls (for example `useAddDishCategory`); short lines such as "Edit form for X" are naming-pattern descriptions. The `Cat` / `Cateror` suffix means the caterer's own copy as opposed to the "admin" copy of the same screen.

### `Caterer/`

| File | Purpose | Used in current app? |
|---|---|---|
| `Cateror.tsx` | Form to add a caterer | No (only used by other dead files) |
| `DisplayCateror.tsx` | Table of caterers | No (only used by other dead files) |
| `UpdateCateror.tsx` | Edit a caterer | No (only used by other dead files) |

### `CaterorDisposal/`

| File | Purpose | Used in current app? |
|---|---|---|
| `DisplayDisposalCat.tsx` | Table/list of disposal (caterer version) | No (only used by other dead files) |
| `DisplayDisposalCategoryCat.tsx` | Table/list of disposal category (caterer version) | No (only used by other dead files) |
| `DisposalCategoryCat.tsx` | Add form for disposal category (caterer version) | No (only used by other dead files) |
| `DisposalCateror.tsx` | Add form for disposal (caterer version) | No (only used by other dead files) |
| `UpdateDisposalCat.tsx` | Edit form for disposal (caterer version) | No (only used by other dead files) |
| `UpdateDisposalCategoryCat.tsx` | Edit form for disposal category (caterer version) | No (only used by other dead files) |

### `CaterorSetting/`

| File | Purpose | Used in current app? |
|---|---|---|
| `ManPower.tsx` | Form for how many waiters/waitresses/cooks a caterer has | No (only used by other dead files) |
| `PaymentDetails.tsx` | Form for bank/payment details printed on bills | No (only used by other dead files) |
| `Setting.tsx` | Tiny wrapper (7 lines) for the settings area | No (only used by other dead files) |
| `TermCondition.tsx` | Form for terms and conditions printed on quotations | No (only used by other dead files) |

### `CaterorUtensils/`

| File | Purpose | Used in current app? |
|---|---|---|
| `DisplayUtensilCategoryCat.tsx` | Table/list of utensil category (caterer version) | No (only used by other dead files) |
| `DisplayUtensilsCat.tsx` | Table/list of utensils (caterer version) | No (only used by other dead files) |
| `UpdateUtensilCategory.tsx` | Edit form for utensil category | No (only used by other dead files) |
| `UpdateUtensilsCat.tsx` | Edit form for utensils (caterer version) | No (only used by other dead files) |
| `UtensilCat.tsx` | Add form for utensil (caterer version) | No (only used by other dead files) |
| `UtensilCategoryCat.tsx` | Add form for utensil category (caterer version) | No (only used by other dead files) |

### `Dish/`

| File | Purpose | Used in current app? |
|---|---|---|
| `AddDish.tsx` | Add form for dish | No (only used by other dead files) |
| `AddPriceRawmaterial.tsx` | Enter raw material prices | No (only used by other dead files) |
| `AddRawMaterial.tsx` | Add form for raw material | No (only used by other dead files) |
| `AddRawMaterialCat.tsx` | Add form for raw material (caterer version) | No (only used by other dead files) |
| `AddRawMaterialToDishCateror.tsx` | Add form for raw material to dish (caterer version) | No (only used by other dead files) |
| `AddRawToDish.tsx` | Add form for raw to dish | No (only used by other dead files) |
| `CustomDropdown/SearchableDropdown.tsx` | Custom searchable dropdown | No (only used by other dead files) |
| `Dish.tsx` | Add form for dish | No (only used by other dead files) |
| `DishCategory.tsx` | Add form for dish category | No (only used by other dead files) |
| `DishCategoryCat.tsx` | Add form for dish category (caterer version) | No (only used by other dead files) |
| `DishMaster.tsx` | Add form for dish master | No (only used by other dead files) |
| `DishMasterCateror.tsx` | Add form for dish master (caterer version) | No (only used by other dead files) |
| `DishNotificatioinData/NewDIshNotification.tsx` | Notification when a new dish is added | No (only used by other dead files) |
| `DishNotificatioinData/NewDishNotifiRawmaterial.tsx` | Notification for new raw material of a dish | No (only used by other dead files) |
| `DishRawMaterialCat.tsx` | Enter raw material quantities for a dish (caterer version) | No (only used by other dead files) |
| `DisplayDish.tsx` | Table/list of dish | No (only used by other dead files) |
| `DisplayDishCat.tsx` | Table/list of dish (caterer version) | No (only used by other dead files) |
| `DisplayDishCategory.tsx` | Table/list of dish category | No (only used by other dead files) |
| `DisplayDishCategoryCat.tsx` | Table/list of dish category (caterer version) | No (only used by other dead files) |
| `DisplayDishMaster.tsx` | Table/list of dish master | No (only used by other dead files) |
| `DisplayRawMaterial.tsx` | Table/list of raw material | No (only used by other dead files) |
| `DisplayRawMaterialCategory.tsx` | Table/list of raw material category | No (only used by other dead files) |
| `DisplayRawMaterialCategoryCat.tsx` | Table/list of raw material category (caterer version) | No (only used by other dead files) |
| `DisplayRawMaterialCateror.tsx` | Table/list of raw material (caterer version) | No (only used by other dead files) |
| `InputSection.tsx` | Reusable input block for dish forms | No (only used by other dead files) |
| `NewDishMaster/DishMasterManagement.tsx` | Tabs wrapper for dish master pages | No (only used by other dead files) |
| `NewDishMaster/MultipleDishAdd.tsx` | Add many dishes at once | No (only used by other dead files) |
| `NewDishMaster/NewDishMaster.tsx` | New dish master screen (caterer) | No (only used by other dead files) |
| `NewDishMaster/NewRawMaterial.tsx` | New raw material entry screen | No (only used by other dead files) |
| `NewDishMasterAdmin/DataEntryPageAdmin.tsx` | Data-entry page (admin) | No (only used by other dead files) |
| `NewDishMasterAdmin/DataEntryRawMaterial.tsx` | Raw material data entry (admin) | No (only used by other dead files) |
| `NewDishMasterAdmin/NewAddRawMaterialAdmin.tsx` | Add raw material (admin) | No (only used by other dead files) |
| `NewDishMasterAdmin/NewDishMasterAdmin.tsx` | New dish master (admin) | No (only used by other dead files) |
| `RawMaterialCategory.tsx` | Add form for raw material category | No (only used by other dead files) |
| `RawMaterialCategoryCateror.tsx` | Add form for raw material category (caterer version) | No (only used by other dead files) |
| `RawMaterialTable.tsx` | Raw material table | No (only used by other dead files) |
| `UpdateDish.tsx` | Edit form for dish | No (only used by other dead files) |
| `UpdateDishCat.tsx` | Edit form for dish (caterer version) | No (only used by other dead files) |
| `UpdateDishCategory.tsx` | Edit form for dish category | No (only used by other dead files) |
| `UpdateDishCategoryCateror.tsx` | Edit form for dish category (caterer version) | No (only used by other dead files) |
| `UpdateDishMasterCateror.tsx` | Edit form for dish master (caterer version) | No (only used by other dead files) |
| `UpdateMasterDish.tsx` | Edit form for master dish | No (only used by other dead files) |
| `UpdateRawMaterial.tsx` | Edit form for raw material | No (only used by other dead files) |
| `UpdateRawMaterialCategory.tsx` | Edit form for raw material category | No (only used by other dead files) |
| `UpdateRawMaterialCategoryCateror.tsx` | Edit form for raw material category (caterer version) | No (only used by other dead files) |
| `UpdateRawMaterialCateror.tsx` | Edit form for raw material (caterer version) | No (only used by other dead files) |

### `Disposal/`

| File | Purpose | Used in current app? |
|---|---|---|
| `DisplayDisposal.tsx` | Table/list of disposal | No (only used by other dead files) |
| `DisplayDisposalCategory.tsx` | Table/list of disposal category | No (only used by other dead files) |
| `Disposal.tsx` | Add form for disposal | No (only used by other dead files) |
| `DisposalCategory.tsx` | Add form for disposal category | No (only used by other dead files) |
| `UpdateDisposal.tsx` | Edit form for disposal | No (only used by other dead files) |
| `UpdateDisposalCategory.tsx` | Edit form for disposal category | No (only used by other dead files) |

### `Event/`

| File | Purpose | Used in current app? |
|---|---|---|
| `AddEvent.tsx` | Add-event form | No (only used by other dead files) |
| `AfterEvent.tsx` | Wrapper (tabs) for after-event checks | No (only used by other dead files) |
| `AfterEvent/DishWastage.tsx` | Record wasted dishes | No (only used by other dead files) |
| `AfterEvent/EventDisposals.tsx` | After-event disposables count | No (only used by other dead files) |
| `AfterEvent/EventPeopleCheck.tsx` | Compare expected vs actual guests | No (only used by other dead files) |
| `AfterEvent/RawMaterialReturn.tsx` | Record unused raw material returned | No (only used by other dead files) |
| `AfterEvent/UtensilChecking.tsx` | Check utensils returned | No (only used by other dead files) |
| `AfterEvent/WastageReport.tsx` | Wastage report | No (only used by other dead files) |
| `Bill.tsx` | Create a bill for an event | No (only used by other dead files) |
| `DishProcess.tsx` | Cooking process per dish | No (only used by other dead files) |
| `DishSelection.tsx` | Pick dishes for a sub-event | No (only used by other dead files) |
| `DisplayAllDishProcess.tsx` | Printable dish process report | No (only used by other dead files) |
| `DisplayEventDisposal.tsx` | List disposables of an event | No (only used by other dead files) |
| `DisplayEventUtensils.tsx` | List utensils of an event | No (only used by other dead files) |
| `Event.tsx` | Form to create a client + event | No (only used by other dead files) |
| `EventDisposal.tsx` | Choose disposables for an event | No (only used by other dead files) |
| `EventManagement.tsx` | Main event page: tabs for sub-events, bill, quotation, income/expense | No (only used by other dead files) |
| `EventModal.tsx` | Popup to add an event (used by the Calendar) | No (only used by other dead files) |
| `EventRateList.tsx` | Per-event raw-material rate list | No (only used by other dead files) |
| `EventUtensil.tsx` | Choose utensils for an event | No (only used by other dead files) |
| `EventUtensilsDisposal.tsx` | Wrapper combining utensils + disposables | No (only used by other dead files) |
| `ExtraRawmaterial.tsx` | Add extra raw material to a sub-event | No (only used by other dead files) |
| `MenuCard.tsx` | Menu card wrapper | No (only used by other dead files) |
| `Rates.tsx` | Rates helper view | No (only used by other dead files) |
| `RawMaterialComponents/AllVendors/AllVendorsList.tsx` | List of vendors for ordering | No (only used by other dead files) |
| `RawMaterialComponents/DishPopup.tsx` | Popup to pick dishes | No (only used by other dead files) |
| `RawMaterialComponents/DishPopupShow.tsx` | Read-only dish popup | No (only used by other dead files) |
| `RawMaterialComponents/DishRow.tsx` | Row component for dish tables | No (only used by other dead files) |
| `RawMaterialComponents/DishTable.tsx` | Dish table component | No (only used by other dead files) |
| `RawMaterialList.tsx` | Wrapper for raw-material list | No (only used by other dead files) |
| `RawMaterialListShow.tsx` | Wrapper, read-only raw-material list | No (only used by other dead files) |
| `RawMaterialOrder.tsx` | Raw material order report for an event (print/share to vendors) | No (only used by other dead files) |
| `ShowBill.tsx` | Show/print a bill | No (only used by other dead files) |
| `SubEvent.tsx` | Form to add a sub-event (one meal/function inside an event) | No (only used by other dead files) |
| `SubEventBill.tsx` | Bill for a sub-event | No (only used by other dead files) |
| `SubEventList.tsx` | List of sub-events | No (only used by other dead files) |
| `SubEventRawMaterialList.tsx` | Raw material list per sub-event (assign to Maharaj) | No (only used by other dead files) |
| `SubEventRawMaterialListShow.tsx` | Read-only view of the above | No (only used by other dead files) |
| `TotalRawMaterial.tsx` | Total raw material needed for all dishes in an event | No (only used by other dead files) |
| `UpdateEventModal.tsx` | Popup to edit an event (used by the Calendar) | No (only used by other dead files) |
| `UpdateSubEvent.tsx` | Edit a sub-event | No (only used by other dead files) |

### `IncomeExpenditure/`

| File | Purpose | Used in current app? |
|---|---|---|
| `DisplayIncomeExpenditureCat.tsx` | Table/list of income expenditure (caterer version) | No (only used by other dead files) |
| `DisplayIncomeExpenditureHead.tsx` | Table/list of income expenditure head | No (only used by other dead files) |
| `DisplayIncomeExpense.tsx` | Table/list of income expense | No (only used by other dead files) |
| `DisplayIncomeExpenseCat.tsx` | Table/list of income expense (caterer version) | No (only used by other dead files) |
| `DisplayIncomeExpnditure.tsx` | Table/list of income expnditure | No (only used by other dead files) |
| `IncomeExpenditure.tsx` | Add form for income expenditure | No (only used by other dead files) |
| `IncomeExpenditureCat.tsx` | Add form for income expenditure (caterer version) | No (only used by other dead files) |
| `IncomeExpenditureHead.tsx` | Add form for income expenditure head | No (only used by other dead files) |
| `UpdateIncomeExpenditureHead.tsx` | Edit form for income expenditure head | No (only used by other dead files) |
| `UpdateInomeExpenditure.tsx` | Edit form for inome expenditure | No (only used by other dead files) |

### `Language/`

| File | Purpose | Used in current app? |
|---|---|---|
| `AddLanguage.tsx` | Form to add a language | No (only used by other dead files) |
| `DisplayLanguage.tsx` | Table of languages | No (only used by other dead files) |

### `Maharaj/`

| File | Purpose | Used in current app? |
|---|---|---|
| `DisplayMaharaj.tsx` | Table/list of maharaj | No (only used by other dead files) |
| `Maharaj.tsx` | Add form for maharaj | No (only used by other dead files) |
| `UpdateMaharaj.tsx` | Edit form for maharaj | No (only used by other dead files) |

### `NotificatioinDishes/`

| File | Purpose | Used in current app? |
|---|---|---|
| `DisplayNotificationDishes.tsx` | Table of new-dish notifications | No (only used by other dead files) |

### `Priority/`

| File | Purpose | Used in current app? |
|---|---|---|
| `AdminPriority.tsx` | Tiny wrapper (7 lines) around Priority | No (only used by other dead files) |
| `Priority.tsx` | Form to set the display priority order of dish categories | No (only used by other dead files) |

### `Process/`

| File | Purpose | Used in current app? |
|---|---|---|
| `DisplayProcess.tsx` | Table/list of process | No (only used by other dead files) |
| `DisplayProcessCat.tsx` | Table/list of process (caterer version) | No (only used by other dead files) |
| `Process.tsx` | Add form for process | No (only used by other dead files) |
| `ProcessCat.tsx` | Add form for process (caterer version) | No (only used by other dead files) |
| `UpdateProcess.tsx` | Edit form for process | No (only used by other dead files) |
| `UpdateProcessCateror.tsx` | Edit form for process (caterer version) | No (only used by other dead files) |

### `Quatation/`

| File | Purpose | Used in current app? |
|---|---|---|
| `Quatation.tsx` | Create a quotation for an event | No (only used by other dead files) |
| `ShowQuatation.tsx` | Show/print a quotation | No (only used by other dead files) |

### `Utensils/`

| File | Purpose | Used in current app? |
|---|---|---|
| `DisplayUtensilCategory.tsx` | Table/list of utensil category | No (only used by other dead files) |
| `DisplayUtensils.tsx` | Table/list of utensils | No (only used by other dead files) |
| `UpdateUtensilCategory.tsx` | Edit form for utensil category | No (only used by other dead files) |
| `UpdateUtensils.tsx` | Edit form for utensils | No (only used by other dead files) |
| `Utensil.tsx` | Add form for utensil | No (only used by other dead files) |
| `UtensilCategory.tsx` | Add form for utensil category | No (only used by other dead files) |

### `Vendor/`

| File | Purpose | Used in current app? |
|---|---|---|
| `DisplayVendor.tsx` | Table/list of vendor | No (only used by other dead files) |
| `ExVendor/DarkModeToggle.tsx` | Dark-mode button for the external vendor page | No (only used by other dead files) |
| `ExternalVendor.tsx` | Public form for an outside vendor to enter rates | No (only used by other dead files) |
| `ShareLink.tsx` | Popup with a link to share with an external vendor | No (only used by other dead files) |
| `UpdateVendor.tsx` | Edit form for vendor | No (only used by other dead files) |
| `Vendor.tsx` | Add form for vendor | No (only used by other dead files) |

## 5. Recommendations (suggestion only, nothing was deleted)

| Folder | Suggestion | Evidence |
|---|---|---|
| Caterer, CaterorDisposal, CaterorSetting, CaterorUtensils | Safe to delete | No importer from routes/pages; hooks they call do not exist |
| Dish, Disposal, Utensils, Process, Maharaj, Vendor | Safe to delete | Only imported by dead `Update.tsx` or each other; missing hooks |
| Event, Quatation, IncomeExpenditure | Safe to delete (together) | Only imported by each other, by dead `common/Calendar.tsx` and dead `Update.tsx` |
| Language, Priority, NotificatioinDishes | Safe to delete | No importer at all |
| `components/Update/Update.tsx` (outside scope) | Delete with the above | Imported by nothing; imports a non-existent route |
| `components/common/Calendar.tsx` and its line in `common/index.ts` | Delete or detach from Event | Unused; only reason it still touches `Event/` |
| `lib/validation/` files such as cartererSchema, dishSchemas, disposalSchema, eventSchema, incomeSchema, languageSchema, maharajSchema, processSchema, rawmaterialSchema, settingSchema, utensilSchema, vendorSchema | Probably dead too; confirm with a grep first | Names match the legacy features (not verified per file) |
| `components/Staff`, `components/client`, `components/Forms/*`, `components/common/*` (other than Calendar) | Keep / check separately | Outside this scope; `Forms/*` is shared widgets that the legacy files merely borrow |

Before deleting: create a git branch, delete the folders, then run `npm run build` and `npx tsc --noEmit` in `frontend/`. Because the folders are unreachable, the build should still pass (and type errors should shrink). Git history keeps the old code if anyone needs it later.

## 6. Five-line summary

1. All 16 folders (158 files) are leftovers from an old catering-management app.
2. No route, page, `App.tsx` or layout imports any of them.
3. The only outside links are `components/Update/Update.tsx` and `components/common/Calendar.tsx`, both themselves unused.
4. Their data hooks (`queriesAndMutations/admin/*` and `cateror/*`) no longer exist, so the files could not compile anyway.
5. Suggestion: delete them as one cleanup commit, then verify with a build.
