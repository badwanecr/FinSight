from __future__ import annotations

import logging

from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    ChangePasswordSerializer,
    FinSightTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
)

logger = logging.getLogger("finsight.auth")
User = get_user_model()


@extend_schema(
    tags=["auth"],
    summary="Register",
    responses={
        201: inline_serializer(
            "RegisterResponse",
            {
                "user": UserSerializer(),
                "access": serializers.CharField(),
                "refresh": serializers.CharField(),
            },
        )
    },
)
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        logger.info("user_registered user_id=%s", user.id)
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["auth"], summary="Log in", description="Returns an access/refresh JWT pair plus the user profile.")
class LoginView(TokenObtainPairView):
    serializer_class = FinSightTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        logger.info("login_success email=%s", request.data.get("email"))
        return response


@extend_schema(
    tags=["auth"],
    summary="Log out",
    request=inline_serializer(
        "LogoutRequest", {"refresh": serializers.CharField(help_text="Refresh token to blacklist")}
    ),
    responses={200: inline_serializer("DetailResponse", {"detail": serializers.CharField()})},
)
class LogoutView(APIView):
    """Best-effort logout — blacklists the refresh token when possible."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = request.data.get("refresh")
        if token:
            try:
                RefreshToken(token).blacklist()
            except (TokenError, AttributeError):
                # Blacklist app not installed / token already invalid — safe to ignore.
                pass
        logger.info("logout user_id=%s", request.user.id)
        return Response({"detail": "Logged out."})


@extend_schema(tags=["auth"], summary="Current user profile")
class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


@extend_schema(
    tags=["auth"],
    summary="Change password",
    request=ChangePasswordSerializer,
    responses={200: inline_serializer("ChangePasswordResponse", {"detail": serializers.CharField()})},
)
class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        logger.info("password_changed user_id=%s", request.user.id)
        return Response({"detail": "Password updated successfully."})
