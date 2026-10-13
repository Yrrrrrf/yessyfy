DEFINE EVENT ledger_immutable ON escrow_entry WHEN $event != 'CREATE' THEN { THROW 'FORBIDDEN: ledger entries are immutable'; };
DEFINE EVENT receipts_immutable ON operation_receipt WHEN $event != 'CREATE' THEN { THROW 'FORBIDDEN: receipts are immutable'; };
DEFINE EVENT provider_events_immutable ON provider_event WHEN $event != 'CREATE' THEN { THROW 'FORBIDDEN: provider events are immutable'; };
DEFINE EVENT invoice_immutable ON tax_invoice WHEN $event != 'CREATE' THEN { THROW 'FORBIDDEN: fiscal confirmations are immutable'; };
DEFINE EVENT post_balances ON escrow_entry WHEN $event='CREATE' THEN {
 LET $debit=(SELECT * FROM ONLY type::record('escrow_account',$after.data.debit) FOR UPDATE);
 LET $credit=(SELECT * FROM ONLY type::record('escrow_account',$after.data.credit) FOR UPDATE);
 IF $debit=NONE OR $credit=NONE OR $debit.id=$credit.id { THROW 'VALIDATION: invalid ledger accounts'; };
 UPDATE $debit.id SET data.balance_cents += $after.data.amount_cents,version += 1;
 UPDATE $credit.id SET data.balance_cents -= $after.data.amount_cents,version += 1;
};
