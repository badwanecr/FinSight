from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Category


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def seed_default_categories(sender, instance, created, **kwargs):
    """Give every newly-created user the default category set."""
    if created:
        Category.create_defaults_for(instance)
