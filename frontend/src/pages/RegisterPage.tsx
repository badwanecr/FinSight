import { useForm } from "react-hook-form";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Alert, Button, Link, Stack, TextField } from "@mui/material";
import { useSnackbar } from "notistack";
import AuthShell from "./AuthShell";
import { useRegisterMutation } from "@/services/authApi";
import { useAppDispatch } from "@/hooks";
import { credentialsReceived } from "@/store/authSlice";
import { errorMessage } from "@/services/api";

interface FormValues {
  name: string;
  email: string;
  password: string;
  confirm: string;
}

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [registerUser, { isLoading, error }] = useRegisterMutation();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { name: "", email: "", password: "", confirm: "" } });

  const onSubmit = async ({ name, email, password }: FormValues) => {
    try {
      const res = await registerUser({ name, email, password }).unwrap();
      dispatch(credentialsReceived(res));
      enqueueSnackbar("Account created. Welcome to FinSight!", { variant: "success" });
      navigate("/", { replace: true });
    } catch {
      /* surfaced inline */
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start tracking your finances in minutes."
      footer={
        <Link component={RouterLink} to="/login">
          Already have an account? Sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2}>
          {error && <Alert severity="error">{errorMessage(error, "Unable to register")}</Alert>}
          <TextField
            label="Full name"
            fullWidth
            {...register("name", { required: "Name is required" })}
            error={!!errors.name}
            helperText={errors.name?.message}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            fullWidth
            {...register("email", { required: "Email is required" })}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            fullWidth
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "At least 8 characters" },
            })}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <TextField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            fullWidth
            {...register("confirm", {
              required: "Please confirm your password",
              validate: (v) => v === watch("password") || "Passwords do not match",
            })}
            error={!!errors.confirm}
            helperText={errors.confirm?.message}
          />
          <Button type="submit" variant="contained" size="large" disabled={isLoading}>
            {isLoading ? "Creating account…" : "Create account"}
          </Button>
        </Stack>
      </form>
    </AuthShell>
  );
}
