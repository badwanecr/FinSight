import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { useSnackbar } from "notistack";
import PageHeader from "@/components/common/PageHeader";
import { ErrorState, TableSkeleton } from "@/components/common/states";
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useListCategoriesQuery,
  useUpdateCategoryMutation,
} from "@/services/categoriesApi";
import type { Category, TransactionType } from "@/types";
import { formatCurrency } from "@/utils/format";
import { errorMessage } from "@/services/api";

interface FormValues {
  name: string;
  type: TransactionType;
  icon: string;
}

export default function CategoriesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, isError, refetch } = useListCategoriesQuery();
  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: deleting }] = useDeleteCategoryMutation();

  const [tab, setTab] = useState<TransactionType>("EXPENSE");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [reassignTo, setReassignTo] = useState<number | "">("");

  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { name: "", type: "EXPENSE", icon: "category" },
  });

  const categories = data?.results ?? [];
  const visible = useMemo(
    () => categories.filter((c) => c.type === tab).sort((a, b) => a.name.localeCompare(b.name)),
    [categories, tab],
  );
  const reassignOptions = useMemo(
    () => (toDelete ? categories.filter((c) => c.type === toDelete.type && c.id !== toDelete.id) : []),
    [categories, toDelete],
  );

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", type: tab, icon: "category" });
    setDialogOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    reset({ name: c.name, type: c.type, icon: c.icon || "category" });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await updateCategory({ id: editing.id, body: { name: values.name, icon: values.icon } }).unwrap();
        enqueueSnackbar("Category updated.", { variant: "success" });
      } else {
        await createCategory(values).unwrap();
        enqueueSnackbar("Category created.", { variant: "success" });
      }
      setDialogOpen(false);
    } catch (err) {
      enqueueSnackbar(errorMessage(err, "Unable to save category"), { variant: "error" });
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteCategory({
        id: toDelete.id,
        reassign_to: reassignTo ? Number(reassignTo) : undefined,
      }).unwrap();
      enqueueSnackbar("Category deleted.", { variant: "success" });
      setToDelete(null);
      setReassignTo("");
    } catch (err) {
      enqueueSnackbar(errorMessage(err, "Unable to delete category"), { variant: "error" });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Categories"
        subtitle="Organise how you classify income and spending"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add category
          </Button>
        }
      />

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Expense" value="EXPENSE" />
        <Tab label="Income" value="INCOME" />
      </Tabs>

      <Card>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : isError ? (
          <Box sx={{ p: 3 }}>
            <ErrorState message="We couldn't load your categories." onRetry={refetch} />
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Transactions</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {c.name}{" "}
                      {c.is_default && (
                        <Chip size="small" label="Default" variant="outlined" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>{c.type === "INCOME" ? "Income" : "Expense"}</TableCell>
                    <TableCell align="right">{c.transaction_count}</TableCell>
                    <TableCell align="right">
                      {c.total_amount ? formatCurrency(c.total_amount) : "—"}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(c)} disabled={c.is_default}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setToDelete(c)}
                        disabled={c.is_default}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 0.5 }}>
              <Controller
                name="name"
                control={control}
                rules={{ required: "Name is required" }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Name"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Type" fullWidth disabled={!!editing}>
                    <MenuItem value="EXPENSE">Expense</MenuItem>
                    <MenuItem value="INCOME">Income</MenuItem>
                  </TextField>
                )}
              />
              <Controller
                name="icon"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Icon key (optional)" fullWidth />
                )}
              />
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

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete category?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {toDelete && toDelete.transaction_count > 0
              ? `“${toDelete.name}” is used by ${toDelete.transaction_count} transaction(s). Choose a category to move them to.`
              : `Delete “${toDelete?.name}”? This cannot be undone.`}
          </DialogContentText>
          {toDelete && toDelete.transaction_count > 0 && (
            <TextField
              select
              fullWidth
              label="Reassign transactions to"
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value ? Number(e.target.value) : "")}
            >
              {reassignOptions.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setToDelete(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={
              deleting ||
              (!!toDelete && toDelete.transaction_count > 0 && !reassignTo)
            }
            onClick={confirmDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
