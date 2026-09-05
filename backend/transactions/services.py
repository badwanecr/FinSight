"""
Balance-keeping for transactions.

All three mutating paths (create / update / delete) run inside a single DB
transaction and lock the affected account row(s) with ``select_for_update`` so
concurrent writes cannot corrupt the cached balance. The previous balance impact
is always reversed before the new one is applied.
"""
from __future__ import annotations

import logging
from decimal import Decimal

from django.db import transaction as db_transaction

from accounts.models import Account
from .models import Transaction

logger = logging.getLogger("finsight.transactions")


def _locked_account(account_id: int) -> Account:
    return Account.objects.select_for_update().get(pk=account_id)


@db_transaction.atomic
def create_transaction(**fields) -> Transaction:
    account = _locked_account(fields["account"].pk if isinstance(fields["account"], Account) else fields["account"])
    txn = Transaction.objects.create(**fields)
    account.balance = (account.balance or Decimal("0")) + txn.signed_amount
    account.save(update_fields=["balance", "updated_at"])
    logger.info(
        "txn_created id=%s account=%s type=%s delta=%s",
        txn.id, account.id, txn.transaction_type, txn.signed_amount,
    )
    return txn


@db_transaction.atomic
def update_transaction(txn: Transaction, **fields) -> Transaction:
    txn = Transaction.objects.select_for_update().get(pk=txn.pk)
    old_account = _locked_account(txn.account_id)
    old_delta = txn.signed_amount

    new_account_id = fields.get("account").pk if isinstance(fields.get("account"), Account) else fields.get("account", txn.account_id)

    for key, value in fields.items():
        setattr(txn, key, value)
    txn.full_clean(exclude=["account", "category"])
    txn.save()

    if new_account_id != old_account.id:
        old_account.balance = (old_account.balance or Decimal("0")) - old_delta
        old_account.save(update_fields=["balance", "updated_at"])
        new_account = _locked_account(new_account_id)
        new_account.balance = (new_account.balance or Decimal("0")) + txn.signed_amount
        new_account.save(update_fields=["balance", "updated_at"])
    else:
        old_account.balance = (old_account.balance or Decimal("0")) - old_delta + txn.signed_amount
        old_account.save(update_fields=["balance", "updated_at"])

    logger.info("txn_updated id=%s old_delta=%s new_delta=%s", txn.id, old_delta, txn.signed_amount)
    return txn


@db_transaction.atomic
def delete_transaction(txn: Transaction) -> None:
    txn = Transaction.objects.select_for_update().get(pk=txn.pk)
    account = _locked_account(txn.account_id)
    account.balance = (account.balance or Decimal("0")) - txn.signed_amount
    account.save(update_fields=["balance", "updated_at"])
    txn_id = txn.id
    txn.delete()
    logger.info("txn_deleted id=%s account=%s reversed=%s", txn_id, account.id, -txn.signed_amount)
