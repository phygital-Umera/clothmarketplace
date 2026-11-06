-- Credit notes are now the only sales-return system (the POS "Sales Return"
-- page used a separate SalesReturn table that the branch never saw). They take
-- over its "adjust against the customer's due" settlement.
ALTER TYPE "ReturnSettlement" ADD VALUE IF NOT EXISTS 'ADJUST_DUE';
