import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Box,
  Button,
  Divider,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import PageHeader from "@/components/common/PageHeader";
import SectionCard from "@/components/common/SectionCard";
import { useListAccountsQuery } from "@/services/accountsApi";
import {
  useChangePasswordMutation,
  useUpdateProfileMutation,
} from "@/services/authApi";
import { useAppDispatch, useAuth } from "@/hooks";
import { userUpdated } from "@/store/authSlice";
import { CURRENCY_OPTIONS } from "@/utils/constants";
import { errorMessage } from "@/services/api";

interface ProfileForm {
  name: string;
  currency: string;
  default_account: number | "";
  notify_anomalies: boolean;
  notify_weekly_summary: boolean;
}

interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm: string;
}

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { data: accounts } = useListAccountsQuery();
  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: savingPassword }] = useChangePasswordMutation();

  const profileForm = useForm<ProfileForm>({
    defaultValues: {
      name: user?.name ?? "",
      currency: user?.currency ?? "INR",
      default_account: user?.default_account ?? "",
      notify_anomalies: user?.notify_anomalies ?? true,
      notify_weekly_summary: user?.notify_weekly_summary ?? false,
    },
  });

  const passwordForm = useForm<PasswordForm>({
    defaultValues: { current_password: "", new_password: "", confirm: "" },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name,
        currency: user.currency,
        default_account: user.default_account ?? "",
        notify_anomalies: user.notify_anomalies,
        notify_weekly_summary: user.notify_weekly_summary,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const saveProfile = async (values: ProfileForm) => {
    try {
      const updated = await updateProfile({
        name: values.name,
        currency: values.currency,
        default_account: values.default_account ? Number(values.default_account) : null,
        notify_anomalies: values.notify_anomalies,
        notify_weekly_summary: values.notify_weekly_summary,
      }).unwrap();
      dispatch(userUpdated(updated));
      enqueueSnackbar("Settings saved.", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(errorMessage(err, "Unable to save settings"), { variant: "error" });
    }
  };

  const savePassword = async (values: PasswordForm) => {
    if (values.new_password !== values.confirm) {
      passwordForm.setError("confirm", { message: "Passwords do not match" });
      return;
    }
    try {
      await changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      }).unwrap();
      enqueueSnackbar("Password updated successfully.", { variant: "success" });
      passwordForm.reset();
    } catch (err) {
      enqueueSnackbar(errorMessage(err, "Unable to change password"), { variant: "error" });
    }
  };

  return (
    <Box>
      <PageHeader title="Settings" subtitle="Manage your profile, preferences and security" />

      <Stack spacing={2}>
        <SectionCard title="Profile & preferences">
          <form onSubmit={profileForm.handleSubmit(saveProfile)}>
            <Stack spacing={2.5}>
              <Controller
                name="name"
                control={profileForm.control}
                rules={{ required: "Name is required" }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Full name"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <TextField label="Email" value={user?.email ?? ""} fullWidth disabled />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Controller
                  name="currency"
                  control={profileForm.control}
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
                <Controller
                  name="default_account"
                  control={profileForm.control}
                  render={({ field }) => (
                    <TextField {...field} select label="Default account" fullWidth>
                      <MenuItem value="">None</MenuItem>
                      {(accounts?.results ?? []).map((a) => (
                        <MenuItem key={a.id} value={a.id}>
                          {a.account_name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Stack>

              <Divider />
              <Typography variant="subtitle2">Notifications</Typography>
              <Controller
                name="notify_anomalies"
                control={profileForm.control}
                render={({ field }) => (
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography>Unusual spending alerts</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Get notified when a transaction looks unusual.
                      </Typography>
                    </Box>
                    <Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                  </Stack>
                )}
              />
              <Controller
                name="notify_weekly_summary"
                control={profileForm.control}
                render={({ field }) => (
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography>Weekly summary</Typography>
                      <Typography variant="caption" color="text.secondary">
                        A short recap of your spending each week.
                      </Typography>
                    </Box>
                    <Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                  </Stack>
                )}
              />

              <Box>
                <Button type="submit" variant="contained" disabled={savingProfile}>
                  Save changes
                </Button>
              </Box>
            </Stack>
          </form>
        </SectionCard>

        <SectionCard title="Security">
          <form onSubmit={passwordForm.handleSubmit(savePassword)}>
            <Stack spacing={2.5} sx={{ maxWidth: 420 }}>
              <Controller
                name="current_password"
                control={passwordForm.control}
                rules={{ required: "Required" }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Current password"
                    type="password"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                name="new_password"
                control={passwordForm.control}
                rules={{ required: "Required", minLength: { value: 8, message: "At least 8 characters" } }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="New password"
                    type="password"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                name="confirm"
                control={passwordForm.control}
                rules={{ required: "Required" }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Confirm new password"
                    type="password"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Box>
                <Button type="submit" variant="contained" disabled={savingPassword}>
                  Update password
                </Button>
              </Box>
            </Stack>
          </form>
        </SectionCard>
      </Stack>
    </Box>
  );
}
