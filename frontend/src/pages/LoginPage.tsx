import { useForm } from "react-hook-form";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Alert, Button, Link, Stack, TextField } from "@mui/material";
import { useSnackbar } from "notistack";
import AuthShell from "./AuthShell";
import { useLoginMutation } from "@/services/authApi";
import { useAppDispatch } from "@/hooks";
import { credentialsReceived } from "@/store/authSlice";
import { errorMessage } from "@/services/api";

interface FormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [login, { isLoading, error }] = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { email: "", password: "" } });

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await login(values).unwrap();
      dispatch(credentialsReceived(res));
      enqueueSnackbar(`Welcome back, ${res.user.name.split(" ")[0]}`, { variant: "success" });
      navigate("/", { replace: true });
    } catch {
      /* surfaced inline below */
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your FinSight dashboard."
      footer={
        <Link component={RouterLink} to="/register">
          New to FinSight? Create an account
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2}>
          {error && <Alert severity="error">{errorMessage(error, "Unable to sign in")}</Alert>}
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
            autoComplete="current-password"
            fullWidth
            {...register("password", { required: "Password is required" })}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Button type="submit" variant="contained" size="large" disabled={isLoading}>
            {isLoading ? "Signing in…" : "Sign in"}
          </Button>
          <Alert severity="info" variant="outlined" sx={{ fontSize: 13 }}>
            Demo: <strong>demo@finsight.app</strong> / <strong>DemoPass123</strong>
          </Alert>
        </Stack>
      </form>
    </AuthShell>
  );
}
