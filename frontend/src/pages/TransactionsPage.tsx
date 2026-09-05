import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import { useSnackbar } from "notistack";
import PageHeader from "@/components/common/PageHeader";
import TypeChip from "@/components/common/TypeChip";
import TransactionFilters from "@/components/transactions/TransactionFilters";
import TransactionFormDialog from "@/components/transactions/TransactionFormDialog";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/common/states";
import {
  useDeleteTransactionMutation,
  useListTransactionsQuery,
} from "@/services/transactionsApi";
import { downloadStatementCsv } from "@/services/statementsApi";
import type { Transaction, TransactionQuery } from "@/types";
import { useAuth } from "@/hooks";
import { errorMessage } from "@/services/api";
import { formatCurrency, formatDate } from "@/utils/format";

const DEFAULT_QUERY: TransactionQuery = { page: 1, page_size: 10, ordering: "-transaction_date" };

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function TransactionsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { access } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState<TransactionQuery>(() => {
    const initial: TransactionQuery = { ...DEFAULT_QUERY };
    const categoryName = searchParams.get("category_name");
    if (categoryName) initial.category_name = categoryName;
    return initial;
  });
  const debouncedSearch = useDebounced(query.search ?? "");
  const effectiveQuery = useMemo(
    () => ({ ...query, search: debouncedSearch || undefined }),
    [query, debouncedSearch],
  );

  const { data, isLoading, isFetching, isError, refetch } =
    useListTransactionsQuery(effectiveQuery);
  const [deleteTxn, { isLoading: deleting }] = useDeleteTransactionMutation();

  const [formOpen, setFormOpen] = useState(searchParams.get("new") === "1");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; txn: Transaction } | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setFormOpen(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const patchQuery = (patch: Partial<TransactionQuery>) =>
    setQuery((q) => ({ ...q, ...patch, page: patch.page ?? 1 }));

  const resetFilters = () => {
    setQuery({ ...DEFAULT_QUERY });
    searchParams.delete("category_name");
    setSearchParams(searchParams, { replace: true });
  };

  const handleSort = (field: string) => {
    setQuery((q) => {
      const desc = q.ordering === field;
      return { ...q, ordering: desc ? `-${field}` : field, page: 1 };
    });
  };

  const sortDir = (field: string): "asc" | "desc" | false => {
    if (query.ordering === field) return "asc";
    if (query.ordering === `-${field}`) return "desc";
    return false;
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteTxn(toDelete.id).unwrap();
      enqueueSnackbar("Transaction deleted.", { variant: "success" });
      setToDelete(null);
    } catch (err) {
      enqueueSnackbar(errorMessage(err, "Unable to delete transaction"), { variant: "error" });
    }
  };

  const exportCsv = async () => {
    const now = new Date();
    try {
      await downloadStatementCsv(
        { year: now.getFullYear(), month: now.getMonth() + 1 },
        access,
      );
    } catch {
      enqueueSnackbar("Unable to export transactions", { variant: "error" });
    }
  };

  const rows = data?.results ?? [];
  const currency = rows[0]?.currency ?? "INR";

  return (
    <Box>
      <PageHeader
        title="Transactions"
        subtitle={data ? `${data.count} transaction${data.count === 1 ? "" : "s"}` : undefined}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add transaction
            </Button>
          </Stack>
        }
      />

      <TransactionFilters value={query} onChange={patchQuery} onReset={resetFilters} />

      <Card>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : isError ? (
          <Box sx={{ p: 3 }}>
            <ErrorState message="We couldn't load your transactions." onRetry={refetch} />
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <EmptyState
              title="No transactions found"
              description="Try adjusting your filters, or add your first transaction to start tracking your finances."
              action={
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
                  Add transaction
                </Button>
              }
            />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sortDirection={sortDir("transaction_date")}>
                      <TableSortLabel
                        active={!!sortDir("transaction_date")}
                        direction={sortDir("transaction_date") || "desc"}
                        onClick={() => handleSort("transaction_date")}
                      >
                        Date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Merchant</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right" sortDirection={sortDir("amount")}>
                      <TableSortLabel
                        active={!!sortDir("amount")}
                        direction={sortDir("amount") || "desc"}
                        onClick={() => handleSort("amount")}
                      >
                        Amount
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody sx={{ opacity: isFetching ? 0.6 : 1 }}>
                  {rows.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell>{formatDate(t.transaction_date)}</TableCell>
                      <TableCell>
                        <Typography fontWeight={600}>{t.merchant || "—"}</Typography>
                        {t.description && (
                          <Typography variant="caption" color="text.secondary">
                            {t.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{t.category_name}</TableCell>
                      <TableCell>{t.account_name}</TableCell>
                      <TableCell>
                        <TypeChip type={t.transaction_type} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          fontWeight={700}
                          color={t.transaction_type === "INCOME" ? "success.main" : "error.main"}
                        >
                          {t.transaction_type === "INCOME" ? "+" : "−"}{" "}
                          {formatCurrency(Math.abs(Number(t.amount)), t.currency || currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => setMenuAnchor({ el: e.currentTarget, txn: t })}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={data?.count ?? 0}
              page={(query.page ?? 1) - 1}
              onPageChange={(_e, p) => setQuery((q) => ({ ...q, page: p + 1 }))}
              rowsPerPage={query.page_size ?? 10}
              onRowsPerPageChange={(e) =>
                setQuery((q) => ({ ...q, page_size: Number(e.target.value), page: 1 }))
              }
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </Card>

      <Menu
        open={!!menuAnchor}
        anchorEl={menuAnchor?.el}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setEditing(menuAnchor!.txn);
            setFormOpen(true);
            setMenuAnchor(null);
          }}
        >
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            setToDelete(menuAnchor!.txn);
            setMenuAnchor(null);
          }}
          sx={{ color: "error.main" }}
        >
          Delete
        </MenuItem>
      </Menu>

      <TransactionFormDialog
        open={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete transaction?"
        message="This reverses its effect on the account balance. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </Box>
  );
}
