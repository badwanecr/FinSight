import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { useSnackbar } from "notistack";
import PageHeader from "@/components/common/PageHeader";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/common/states";
import {
  useCreateAccountMutation,
  useDeleteAccountMutation,
  useListAccountsQuery,
  useUpdateAccountMutation,
} from "@/services/accountsApi";
import type { Account } from "@/types";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_OPTIONS, CURRENCY_OPTIONS } from "@/utils/constants";
import { formatCurrency } from "@/utils/format";
import { errorMessage } from "@/services/api";

interface FormValues {
  account_name: string;
  account_type: Account["account_type"];
  currency: string;
  opening_balance: string;
  is_active: boolean;
}

export default function AccountsPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, isError, refetch } = useListAccountsQuery();
  const [createAccount, { isLoading: creating }] = useCreateAccountMutation();
  const [updateAccount, { isLoading: updating }] = useUpdateAccountMutation();
  const [deleteAccount, { isLoading: deleting }] = useDeleteAccountMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [toDelete, setToDelete] = useState<Account | null>(null);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      account_name: "",
      account_type: "BANK",
      currency: "INR",
      opening_balance: "0",
      is_active: true,
    },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ account_name: "", account_type: "BANK", currency: "INR", opening_balance: "0", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (acc: Account) => {
    setEditing(acc);
    reset({
      account_name: acc.account_name,
      account_type: acc.account_type,
      currency: acc.currency,
      opening_balance: acc.balance,
      is_active: acc.is_active,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await updateAccount({
          id: editing.id,
          body: {
            account_name: values.account_name,
            account_type: values.account_type,
            currency: values.currency,
            is_active: values.is_active,
          },
        }).unwrap();
        enqueueSnackbar("Account updated.", { variant: "success" });
      } else {
        await createAccount({
          account_name: values.account_name,
          account_type: values.account_type,
          currency: values.currency,
          opening_balance: Number(values.opening_balance) || 0,
        }).unwrap();
        enqueueSnackbar("Account created.", { variant: "success" });
      }
      setDialogOpen(false);
    } catch (err) {
      enqueueSnackbar(errorMessage(err, "Unable to save account"), { variant: "error" });
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteAccount(toDelete.id).unwrap();
      enqueueSnackbar("Account deleted.", { variant: "success" });
      setToDelete(null);
    } catch (err) {
      enqueueSnackbar(errorMessage(err, "Unable to delete account"), { variant: "error" });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Accounts"
        subtitle="Your bank accounts, cards, wallets and investments"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add account
          </Button>
        }
      />

      {isLoading ? (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3,1fr)" } }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} height={180} />
          ))}
        </Box>
      ) : isError ? (
        <ErrorState message="We couldn't load your accounts." onRetry={refetch} />
      ) : (data?.results.length ?? 0) === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Add your first account (bank, cash, credit card…) to start recording transactions."
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Add account
            </Button>
          }
        />
      ) : (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3,1fr)" } }}>
          {data!.results.map((acc) => (
            <Card key={acc.id}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h4">{acc.account_name}</Typography>
                    <Chip
                      size="small"
                      label={ACCOUNT_TYPE_LABELS[acc.account_type]}
                      sx={{ mt: 0.5 }}
                      variant="outlined"
                    />
                  </Box>
                  {!acc.is_active && <Chip size="small" color="default" label="Inactive" />}
                </Stack>
                <Typography variant="h2" sx={{ mt: 2 }}>
                  {formatCurrency(acc.balance, acc.currency)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {acc.transaction_count} transaction{acc.transaction_count === 1 ? "" : "s"}
                </Typography>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                <Button
                  size="small"
                  onClick={() => navigate(`/transactions?account=${acc.id}`)}
                >
                  View
                </Button>
                <IconButton size="small" onClick={() => openEdit(acc)}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => setToDelete(acc)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? "Edit account" : "Add account"}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 0.5 }}>
              <Controller
                name="account_name"
                control={control}
                rules={{ required: "Name is required" }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Account name"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                name="account_type"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Type" fullWidth>
                    {ACCOUNT_TYPE_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Currency" fullWidth>
                    {CURRENCY_OPTIONS.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              {!editing && (
                <Controller
                  name="opening_balance"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Opening balance" type="number" fullWidth />
                  )}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={creating || updating}>
              {editing ? "Save" : "Create"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete account?"
        message={
          toDelete && toDelete.transaction_count > 0
            ? "This account has transactions and cannot be deleted. Deactivate it instead."
            : "This permanently removes the account. This cannot be undone."
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </Box>
  );
}
