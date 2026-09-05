import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useSnackbar } from "notistack";
import dayjs from "dayjs";
import type { Transaction, TransactionInput, TransactionType } from "@/types";
import { useListAccountsQuery } from "@/services/accountsApi";
import { useListCategoriesQuery } from "@/services/categoriesApi";
import {
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
} from "@/services/transactionsApi";
import { errorMessage } from "@/services/api";

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: Transaction | null;
  defaultAccountId?: number | null;
}

interface FormValues {
  transaction_type: TransactionType;
  amount: string;
  account: number | "";
  category: number | "";
  merchant: string;
  description: string;
  transaction_date: string;
}

const EMPTY: FormValues = {
  transaction_type: "EXPENSE",
  amount: "",
  account: "",
  category: "",
  merchant: "",
  description: "",
  transaction_date: dayjs().format("YYYY-MM-DD"),
};

export default function TransactionFormDialog({ open, onClose, editing, defaultAccountId }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: accounts } = useListAccountsQuery();
  const { data: categories } = useListCategoriesQuery();
  const [createTxn, { isLoading: creating }] = useCreateTransactionMutation();
  const [updateTxn, { isLoading: updating }] = useUpdateTransactionMutation();

  const { control, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: EMPTY,
  });

  const txnType = watch("transaction_type");

  const filteredCategories = useMemo(
    () => (categories?.results ?? []).filter((c) => c.type === txnType),
    [categories, txnType],
  );

  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({
        transaction_type: editing.transaction_type,
        amount: editing.amount,
        account: editing.account,
        category: editing.category,
        merchant: editing.merchant,
        description: editing.description,
        transaction_date: editing.transaction_date,
      });
    } else {
      reset({ ...EMPTY, account: defaultAccountId ?? "" });
    }
  }, [open, editing, defaultAccountId, reset]);

  // If the selected category no longer matches the type, clear it.
  useEffect(() => {
    const current = watch("category");
    if (current && !filteredCategories.some((c) => c.id === current)) {
      setValue("category", "");
    }
  }, [filteredCategories, setValue, watch]);

  const onSubmit = async (values: FormValues) => {
    const payload: TransactionInput = {
      transaction_type: values.transaction_type,
      amount: Number(values.amount),
      account: Number(values.account),
      category: Number(values.category),
      merchant: values.merchant.trim(),
      description: values.description.trim(),
      transaction_date: values.transaction_date,
    };
    try {
      if (editing) {
        await updateTxn({ id: editing.id, body: payload }).unwrap();
        enqueueSnackbar("Transaction updated successfully.", { variant: "success" });
      } else {
        await createTxn(payload).unwrap();
        enqueueSnackbar("Transaction added successfully.", { variant: "success" });
      }
      onClose();
    } catch (err) {
      enqueueSnackbar(errorMessage(err, "Unable to save transaction"), { variant: "error" });
    }
  };

  const busy = creating || updating;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? "Edit transaction" : "Add transaction"}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <Controller
              name="transaction_type"
              control={control}
              render={({ field }) => (
                <ToggleButtonGroup
                  exclusive
                  color="primary"
                  value={field.value}
                  onChange={(_e, v) => v && field.onChange(v)}
                  fullWidth
                >
                  <ToggleButton value="EXPENSE">Expense</ToggleButton>
                  <ToggleButton value="INCOME">Income</ToggleButton>
                </ToggleButtonGroup>
              )}
            />

            <Controller
              name="amount"
              control={control}
              rules={{
                required: "Amount is required",
                validate: (v) => Number(v) > 0 || "Amount must be positive",
              }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Amount"
                  type="number"
                  inputProps={{ step: "0.01", min: "0" }}
                  fullWidth
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Controller
                name="account"
                control={control}
                rules={{ required: "Account is required" }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    select
                    label="Account"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  >
                    {(accounts?.results ?? []).map((a) => (
                      <MenuItem key={a.id} value={a.id}>
                        {a.account_name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="category"
                control={control}
                rules={{ required: "Category is required" }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    select
                    label="Category"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? `${txnType.toLowerCase()} categories`}
                  >
                    {filteredCategories.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Stack>

            <Controller
              name="merchant"
              control={control}
              render={({ field }) => <TextField {...field} label="Merchant" fullWidth />}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Description" fullWidth multiline minRows={2} />
              )}
            />
            <Controller
              name="transaction_date"
              control={control}
              rules={{ required: "Date is required" }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add transaction"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
