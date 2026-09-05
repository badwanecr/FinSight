from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwner(BasePermission):
    """Object-level guard: the resource must belong to the requesting user.

    Works for models exposing either a direct ``user`` FK or an ``account.user``
    chain (transactions).
    """

    def has_object_permission(self, request, view, obj):
        owner = getattr(obj, "user", None)
        if owner is None and hasattr(obj, "account"):
            owner = getattr(obj.account, "user", None)
        return owner == request.user


class IsOwnerOrReadOnlyDefault(BasePermission):
    """Allow read for owned rows; block writes on ``is_default`` system rows."""

    def has_object_permission(self, request, view, obj):
        if getattr(obj, "user", None) != request.user:
            return False
        if request.method in SAFE_METHODS:
            return True
        return not getattr(obj, "is_default", False)
